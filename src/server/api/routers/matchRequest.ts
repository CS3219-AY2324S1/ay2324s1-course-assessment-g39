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
      const userId = ctx.session.user.id;

      const existingRequest = await ctx.prismaPostgres.matchRequest.findFirst({
        where: { userId },
      });
      if (existingRequest) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Request already exists",
        });
      }

      // actually above check not required since
      // there is already a unique constraint on userId
      const request = await ctx.prismaPostgres.matchRequest.create({
        data: { userId, difficulty, category, matchType },
      });

      ee.emit("add", request);
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

      const updatedRequest = await ctx.prismaPostgres.matchRequest.update({
        where: { userId },
        data: { difficulty, category },
      });
      ee.emit("update", updatedRequest);
    }),

  deleteCurrentUserMatchRequest: protectedProcedure.mutation(
    async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const request = await ctx.prismaPostgres.matchRequest.delete({
        where: { userId },
      });

      ee.emit("remove", request);
    },
  ),

  subscribeToAllRequests: protectedProcedure.subscription(() => {
    return observable<UserRequest & { mode: "add" | "remove" | "update" }>(
      (emit) => {
        // todo(gab): Consider using only one since currently the subscription only tells to refetch
        const onAdd = (data: UserRequest) => {
          emit.next({ ...data, mode: "add" });
        };
        const onRemove = (data: UserRequest) => {
          emit.next({ ...data, mode: "remove" });
        };
        const onUpdate = (data: UserRequest) => {
          emit.next({ ...data, mode: "update" });
        };
        ee.on("update", onUpdate);
        ee.on("add", onAdd);
        ee.on("remove", onRemove);
        return () => {
          ee.off("add", onAdd);
          ee.off("remove", onRemove);
          ee.off("update", onUpdate);
        };
      },
    );
  }),

  checkAndProcessAutoMatchIfPossible: protectedProcedure.mutation(
    async ({ ctx }) => {
      const curUserId = ctx.session.user.id;

      const curUserMatchRequest = await prismaPostgres.matchRequest.findUnique({
        where: {
          userId: curUserId,
          matchType: "AUTO",
        },
      });
      if (!curUserMatchRequest) return;

      const findMatchingRequest = async () => {
        const request = await prismaPostgres.matchRequest.findFirst({
          where: {
            category: curUserMatchRequest.category,
            difficulty: curUserMatchRequest.difficulty,
            matchType: "AUTO",
            userId: { not: curUserId },
          },
        });
        if (!request) return null;
        return filterMatchRequestForUser(request);
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
      const tryMatch = async (potentialRequest: Request) => {
        const confirmMatch = await isRequestInDB(potentialRequest);
        if (confirmMatch) {
          await deleteMatchedRequests(curUserId, potentialRequest.userId);
          ee.emit("matchedAutomatciRequests", {
            user1Id: curUserId,
            user2Id: potentialRequest.userId,
          });
        }
      };

      await mutex.runExclusive(async () => tryMatch(potentialMatchedRequest));
    },
  ),

  subscribeToAutomaticRequests: protectedProcedure.subscription(({ ctx }) => {
    return observable<{ user1Id: string; user2Id: string }>((emit) => {
      const findSync = (arg1: { user1Id: string; user2Id: string }) => {
        emit.next(arg1);
      };

      ee.on("matchedAutomatciRequests", findSync);
      return () => {
        ee.off("matchedAutomatciRequests", findSync);
      };
    });
  }),

  // accept a match of another user
  acceptMatch: protectedProcedure
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

      const deleteMatchedRequest = async (userId: string) => {
        return await prismaPostgres.matchRequest.delete({
          where: { userId },
        });
      };

      /**
       * WARNING: must be run syncronously to avoid race conditions
       * if request found in DB
       * (1) delete request
       * (2) notify Client by triggering event
       */
      const tryMatch = async (curUserId: string, acceptedUserId: string) => {
        const confirmMatch = await isRequestInDB(acceptedUserId);
        if (confirmMatch) {
          await deleteMatchedRequest(acceptedUserId);
          ee.emit("confirm", { user1Id: curUserId, user2Id: acceptedUserId });
        }
      };

      await mutex.runExclusive(async () => tryMatch(curUserId, acceptedUserId));
    }),

  // Users listens for confirmation from other user to join the session
  subscribeToConfirmation: protectedProcedure.subscription(() => {
    return observable<{ user1Id: string; user2Id: string }>((emit) => {
      const onConfirm = (data: { user1Id: string; user2Id: string }) => {
        emit.next(data);
      };

      ee.on("confirm", onConfirm);
      return () => {
        ee.off("confirm", onConfirm);
      };
    });
  }),

  // Users listens for confirmation from other user to join the session
  subscribeToMatchedRequests: protectedProcedure.subscription(() => {
    return observable<{ user1Id: string; user2Id: string }>((emit) => {
      const onMatch = (data: { user1Id: string; user2Id: string }) => {
        emit.next(data);
      };

      ee.on("matchedRequest", onMatch);
      return () => {
        ee.off("matchedRequest", onMatch);
      };
    });
  }),
});
