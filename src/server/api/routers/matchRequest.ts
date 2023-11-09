/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prismaPostgres } from "~/server/db";
import { MatchType, type MatchRequest } from "@prisma-db-psql/client";

/**
 * A lock for synchronizing async operations.
 * Use this to protect a critical section
 * from getting modified by multiple async operations
 * at the same time.
 * https://dev.to/0916dhkim/simple-typescript-mutex-implementation-5544
 */
export class Mutex {
  /**
   * When multiple operations attempt to acquire the lock,
   * this queue remembers the order of operations.
   */
  private _queue: {
    resolve: (release: ReleaseFunction) => void;
  }[] = [];

  private _isLocked = false;

  /**
   * Wait until the lock is acquired.
   * @returns A function that releases the acquired lock.
   */
  acquire() {
    return new Promise<ReleaseFunction>((resolve) => {
      this._queue.push({ resolve });
      this._dispatch();
    });
  }

  /**
   * Enqueue a function to be run serially.
   *
   * This ensures no other functions will start running
   * until `callback` finishes running.
   * @param callback Function to be run exclusively.
   * @returns The return value of `callback`.
   */
  async runExclusive<T>(callback: () => Promise<T>) {
    const release = await this.acquire();
    try {
      return await callback();
    } finally {
      release();
    }
  }

  /**
   * Check the availability of the resource
   * and provide access to the next operation in the queue.
   *
   * _dispatch is called whenever availability changes,
   * such as after lock acquire request or lock release.
   */
  private _dispatch() {
    if (this._isLocked) {
      // The resource is still locked.
      // Wait until next time.
      return;
    }
    const nextEntry = this._queue.shift();
    if (!nextEntry) {
      // There is nothing in the queue.
      // Do nothing until next dispatch.
      return;
    }
    // The resource is available.
    this._isLocked = true; // Lock it.
    // and give access to the next operation
    // in the queue.
    nextEntry.resolve(this._buildRelease());
  }

  /**
   * Build a release function for each operation
   * so that it can release the lock after
   * the operation is complete.
   */
  private _buildRelease(): ReleaseFunction {
    return () => {
      // Each release function make
      // the resource available again
      this._isLocked = false;
      // and call dispatch.
      this._dispatch();
    };
  }
}

type ReleaseFunction = () => void;
import { type Difficulty, difficulties } from "../../../types/global";
import { id_z } from "./user";
import { match } from "assert";

const difficulties_z = z.enum(difficulties);
const matchType_z = z.enum(["AUTO", "MANUAL"]);
const category_z = z.string().min(1);
const userId_z = z.string().min(1);

const createReqInput_z = z.object({
  difficulty: difficulties_z,
  category: category_z,
  matchType: matchType_z,
});

// const addJoinRequestObject = z.object({
//   joiningUser: z.string(),
//   joiningUserId: z.string(),
//   originalRequestId: z.string(),
// });

type UserRequest = {
  id: string;
  name: string;
  difficulty: Difficulty;
  category: string;
};

const mutex = new Mutex();
const ee = new EventEmitter();

type Request = Omit<MatchRequest, "id" | "cursor" | "createdAt">;
const filterMatchRequestForUser = (request: MatchRequest) => {
  const { id, cursor, createdAt, ...matchRequest } = request;
  return matchRequest;
};

export const matchRequestRouter = createTRPCRouter({
  getAllManualMatchRequests: protectedProcedure.query(async ({ ctx }) => {
    const requests = await ctx.prismaPostgres.matchRequest.findMany({
      where: { matchType: "MANUAL" },
      select: {
        user: true,
        difficulty: true,
        category: true,
        matchType: true,
        createdAt: true,
      },
    });
    return requests;
  }),

  getNumOfMatchRequests: protectedProcedure.query(async ({ ctx }) => {
    const num = await ctx.prismaPostgres.matchRequest.count();
    return num;
  }),

  createCurrentUserMatchRequest: protectedProcedure
    .input(createReqInput_z)
    .mutation(async ({ ctx, input }) => {
      const { difficulty, category, matchType } = input;
      const curUserId = ctx.session.user.id;

      await ctx.prismaPostgres.matchRequest.create({
        data: { userId: curUserId, difficulty, category, matchType },
      });

      // user has successfully created request
      if (matchType == "MANUAL") {
        ee.emit("manualMatchRequestsChanged");
        return;
      }

      // if its an automatic request, check for a match in the DB
      const findMatchingRequest = async () => {
        const request = await prismaPostgres.matchRequest.findFirst({
          where: {
            matchType: "AUTO",
            category,
            difficulty,
            userId: { not: curUserId },
          },
        });
        if (request) return filterMatchRequestForUser(request);
      };

      // minimise the need to enter the mutex by checking if there is a match first
      const potentialMatchedRequest = await findMatchingRequest();
      if (!potentialMatchedRequest) return;

      const isRequestInDB = async (request: Request) => {
        const reqExists = await prismaPostgres.matchRequest.findFirst({
          where: { ...request },
        });
        return reqExists ? true : false;
      };

      const deleteMatchedRequests = async (
        userId1: string,
        userId2: string,
      ) => {
        return await prismaPostgres.matchRequest.deleteMany({
          where: { userId: { in: [userId1, userId2] } },
        });
      };

      /**
       * WARNING: must be run syncronously to avoid race conditions
       * if request found in DB
       * (1) delete both users
       * (2) notify Client by triggering event
       */
      const tryMatch = async (userId: string, potentialRequest: Request) => {
        const confirmMatch = await isRequestInDB(potentialRequest);
        if (confirmMatch) {
          ee.emit("confirmedMatch", {
            userId1: userId,
            userId2: potentialRequest.userId,
          });
          await deleteMatchedRequests(userId, potentialRequest.userId);
        }
      };

      await mutex.runExclusive(async () =>
        tryMatch(curUserId, potentialMatchedRequest),
      );
    }),

  getCurrentUserRequest: protectedProcedure.query(async ({ ctx }) => {
    const ownRequest = await ctx.prismaPostgres.matchRequest.findUnique({
      where: { userId: ctx.session.user.id },
      select: {
        user: true,
        difficulty: true,
        category: true,
        matchType: true,
        createdAt: true,
      },
    });
    return ownRequest;
  }),

  // note: unable to modify type from manual to auto
  // hence it does not require a check for automatic match requests
  updateCurrentUserMatchRequest: protectedProcedure
    .input(
      z.object({
        difficulty: difficulties_z,
        category: category_z,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { difficulty, category } = input;
      const userId = ctx.session.user.id;

      const existingRequest = await ctx.prismaPostgres.matchRequest.findFirst({
        where: { userId },
      });
      if (!existingRequest) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request already exists",
        });
      }

      await ctx.prismaPostgres.matchRequest.update({
        where: { userId },
        data: { difficulty, category },
      });

      ee.emit("manualMatchRequestsChanged");
    }),

  deleteCurrentUserMatchRequest: protectedProcedure.mutation(
    async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await ctx.prismaPostgres.matchRequest.delete({
        where: { userId },
      });

      ee.emit("manualMatchRequestsChanged");
    },
  ),

  subscribeToManualMatchRequestsChange: protectedProcedure.subscription(() => {
    return observable<boolean>((emit) => {
      const onMatchRequestsChange = () => {
        emit.next(true);
      };

      ee.on("manualMatchRequestsChanged", onMatchRequestsChange);
      return () => {
        ee.off("manualMatchRequestsChanged", onMatchRequestsChange);
      };
    });
  }),

  // accept a match of another user
  acceptManualMatch: protectedProcedure
    .input(z.object({ acceptedUserId: userId_z }))
    .mutation(async ({ ctx, input }) => {
      const curUserId = ctx.session.user.id;
      const { acceptedUserId } = input;
      const matchedRequest = await ctx.prismaPostgres.matchRequest.findFirst({
        where: { userId: acceptedUserId },
      });
      if (!matchedRequest) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Accepted match request does not exist",
        });
      }

      const isRequestInDB = async (userId: string) => {
        const reqExists = await prismaPostgres.matchRequest.findFirst({
          where: { userId },
        });
        return reqExists ? true : false;
      };

      const deleteMatchedRequests = async (
        userId1: string,
        userId2: string,
      ) => {
        return await prismaPostgres.matchRequest.deleteMany({
          where: { userId: { in: [userId1, userId2] } },
        });
      };

      /**
       * WARNING: must be run syncronously to avoid race conditions
       * if request found in DB
       * (1) delete requests of both users
       * (2) notify Client by triggering event
       */
      const tryMatch = async (curUserId: string, acceptedUserId: string) => {
        const confirmMatch = await isRequestInDB(acceptedUserId);
        if (confirmMatch) {
          ee.emit("confirmedMatch", {
            userId1: curUserId,
            userId2: acceptedUserId,
          });
          await deleteMatchedRequests(acceptedUserId, curUserId);
        }
      };

      await mutex.runExclusive(async () => tryMatch(curUserId, acceptedUserId));
    }),

  // Users listens for confirmation from other user to join the session
  subscribeToMyRequestSuccess: protectedProcedure.subscription(() => {
    return observable<{ userId1: string; userId2: string }>((emit) => {
      const onConfirmedMatch = (data: { userId1: string; userId2: string }) => {
        emit.next(data);
      };

      ee.on("confirmedMatch", onConfirmedMatch);
      return () => {
        ee.off("confirmedMatch", onConfirmedMatch);
      };
    });
  }),
});
