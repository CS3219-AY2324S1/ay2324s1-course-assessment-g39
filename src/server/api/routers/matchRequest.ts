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
import { MatchType } from "@prisma-db-psql/client";

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

  deleteCurrentUserMatchRequest: protectedProcedure.mutation(
    async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const request = await ctx.prismaPostgres.matchRequest.delete({
        where: { userId },
      });

      ee.emit("remove", request);
    },
  ),

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

  subscribeToAllRequests: protectedProcedure.subscription(() => {
    return observable<
      UserRequest & {
        mode: "add" | "remove" | "update";
      }
    >((emit) => {
      // todo(gab): Consider using only one since currently the subscription only tells to refetch
      const onAdd = (data: UserRequest) => {
        emit.next({
          ...data,
          mode: "add",
        });
      };
      const onRemove = (data: UserRequest) => {
        emit.next({
          ...data,
          mode: "remove",
        });
      };
      const onUpdate = (data: UserRequest) => {
        emit.next({
          ...data,
          mode: "update",
        });
      };
      ee.on("update", onUpdate);
      ee.on("add", onAdd);
      ee.on("remove", onRemove);
      return () => {
        ee.off("add", onAdd);
        ee.off("remove", onRemove);
        ee.off("update", onUpdate);
      };
    });
  }),

  // Users want to match with other user
  // addJoinRequest: protectedProcedure
  //   .input(addJoinRequestObject)
  //   .mutation(async ({ ctx, input }) => {
  //     const { joiningUser, joiningUserId, originalRequestId } = input;

  //     const existingRequest = await ctx.prismaPostgres.joinRequest
  //       .findFirst({
  //         where: {
  //           fromName: joiningUser,
  //           fromId: joiningUserId,
  //           toId: originalRequestId,
  //         },
  //       })
  //       .then((req) => {
  //         return req;
  //       });

  //     if (!existingRequest) {
  //       await ctx.prismaPostgres.joinRequest.create({
  //         data: {
  //           fromName: joiningUser,
  //           fromId: joiningUserId,
  //           toId: originalRequestId,
  //         },
  //       });

  //       ee.emit("join", { joiningUser, joiningUserId, originalRequestId });
  //     }
  //   }),

  notifyOnAutomaticMatchedRequests: protectedProcedure.mutation(
    async ({ ctx, input }) => {
      const curUserId = ctx.session.user.id;

      // try find a matching request
      // if found, emit the two users
      async function findMatchFor({ userId }: { userId: string }) {
        const curUserMatchRequest =
          await prismaPostgres.matchRequest.findUnique({
            where: { userId },
          });
        if (!curUserMatchRequest) return;

        const toRunSync = async () => {
          const matchedRequest = await prismaPostgres.matchRequest.findFirst({
            where: {
              AND: {
                category: curUserMatchRequest.category,
                difficulty: curUserMatchRequest.difficulty,
                matchType: "AUTO",
                userId: { not: userId },
              },
            },
          });
          if (matchedRequest) {
            await prismaPostgres.matchRequest.deleteMany({
              where: {
                userId: { in: [userId, matchedRequest.userId] },
              },
            });
          }
          return matchedRequest;
        };

        const matchedRequest = await mutex.runExclusive(toRunSync);
        if (!matchedRequest) return;

        ee.emit("findAutomatic", {
          user1Id: userId,
          user2Id: matchedRequest.userId,
        });
      }

      await findMatchFor({ userId: curUserId });
    },
  ),
  /**
   * Endpoint needed to ensure that no too users are matched repeatedly
   */
  subscribeToAutomaticRequests: protectedProcedure.subscription(({ ctx }) => {
    return observable<{ user1Id: string; user2Id: string }>((emit) => {
      const findSync = (arg1: { user1Id: string; user2Id: string }) => {
        emit.next(arg1);
      };

      ee.on("findAutomatic", findSync);
      return () => {
        ee.off("findAutomatic", findSync);
      };
    });
  }),
  // Users listens to other users who want to join their session
  subscribeToJoinRequests: protectedProcedure.subscription(() => {
    return observable<{
      joiningUser: string;
      joiningUserId: string;
      originalRequestId: string;
    }>((emit) => {
      const onJoinRequest = (data: {
        joiningUser: string;
        joiningUserId: string;
        originalRequestId: string;
      }) => {
        emit.next(data);
      };
      ee.on("join", onJoinRequest);
      return () => {
        ee.off("join", onJoinRequest);
      };
    });
  }),

  // confirm a match between 2 different users
  confirmMatch: protectedProcedure
    .input(z.object({ userId1: userId_z, userId2: userId_z }))
    .mutation(async ({ ctx, input }) => {
      const { userId1, userId2 } = input;
      const matchedRequests = await ctx.prismaPostgres.matchRequest.findMany({
        where: { userId: { in: [userId1, userId2] } },
      });
      if (matchedRequests.length !== 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Match request for both users not found",
        });
      }

      await ctx.prismaPostgres.matchRequest.deleteMany({
        where: { userId: { in: [userId1, userId2] } },
      });

      ee.emit("confirm", { user1Id: userId1, user2Id: userId2 });
    }),
});
