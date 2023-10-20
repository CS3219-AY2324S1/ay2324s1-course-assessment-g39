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
          this._queue.push({resolve});
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

const userObject = z.object({
  id: z.string(),
  name: z.string(),
  difficulty: z.enum(difficulties),
  category: z.string(),
  matchType: z.enum(["AUTO", "MANUAL"]),
});

const addJoinRequestObject = z.object({
  joiningUser: z.string(),
  joiningUserId: z.string(),
  originalRequestId: z.string(),
});

type UserRequest = {
  id: string;
  name: string;
  difficulty: Difficulty;
  category: string;
};

const mutex = new Mutex();

const ee = new EventEmitter();

export const matchRequestRouter = createTRPCRouter({
  getAllOtherRequests: protectedProcedure.query(async ({ ctx }) => {
    const requests = await ctx.prismaPostgres.matchRequest.findMany({
      where: {
        NOT: [
          {
            OR: [
              {
                userId: ctx.session.user.id,
              },
              {
                matchType: "AUTO",
              },
            ],
          },
        ],
      },
    });
    return {
      requests,
      count: await ctx.prismaPostgres.matchRequest.count(),
    };
  }),
  getOwnRequest: protectedProcedure.query(async ({ ctx }) => {
    const ownRequest = await ctx.prismaPostgres.matchRequest.findUnique({
      where: {
        userId: ctx.session?.user.id,
      },
    });
    if (ownRequest === null) {
      return {
        message: "This user has no requests",
        success: false,
      };
    }
    return {
      ownRequest,
      message: "Success",
      success: true,
    };
  }),
  getJoinRequests: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prismaPostgres.joinRequest.findMany({
      where: {
        toId: ctx.session?.user.id,
      },
    });
  }),

  addRequest: protectedProcedure
    .input(userObject)
    .mutation(async ({ ctx, input }) => {
      const { id, name, difficulty, category, matchType } = input;

      const existingRequest = await ctx.prismaPostgres.matchRequest
        .findFirst({
          where: {
            id: id,
          },
        })
        .then((req) => {
          return req;
        });

      if (existingRequest) {
        return {
          msg: "Request already exists",
          partner: "",
          isSuccess: false,
          difficulty,
          category,
          requestId: existingRequest.id,
        };
      }

      const request = await ctx.prismaPostgres.matchRequest
        .create({
          data: {
            id,
            userId: ctx.session.user.id,
            name,
            difficulty,
            category,
            matchType,
          },
        })
        .then((req) => {
          return req;
        });

      ee.emit("add", request);

      return {
        msg:
          request.matchType == "MANUAL"
            ? "Room created"
            : "Searching for partner...",
        partner: "",
        isSuccess: true,
        difficulty,
        category,
        requestId: request.id,
      };
    }),

  cancelRequest: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      const request = await ctx.prismaPostgres.matchRequest
        .delete({
          where: {
            id,
          },
        })
        .then((req) => {
          return req;
        });

      ee.emit("remove", request);

      return {
        msg: "Request cancelled",
        partner: "",
        isSuccess: false,
      };
    }),

  editRequest: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        difficulty: z.enum(difficulties),
        category: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, difficulty, category } = input;

      const request = await ctx.prismaPostgres.matchRequest
        .findFirst({
          where: {
            id,
          },
        })
        .then((req) => {
          return req;
        });

      if (!request) {
        throw new Error("Request not found");
      }

      const updatedRequest = await ctx.prismaPostgres.matchRequest.update({
        where: {
          id,
        },
        data: {
          difficulty,
          category,
        },
      });
      ee.emit("update", updatedRequest);
      return updatedRequest;
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
  addJoinRequest: protectedProcedure
    .input(addJoinRequestObject)
    .mutation(async ({ ctx, input }) => {
      const { joiningUser, joiningUserId, originalRequestId } = input;

      const existingRequest = await ctx.prismaPostgres.joinRequest
        .findFirst({
          where: {
            fromName: joiningUser,
            fromId: joiningUserId,
            toId: originalRequestId,
          },
        })
        .then((req) => {
          return req;
        });

      if (!existingRequest) {
        await ctx.prismaPostgres.joinRequest.create({
          data: {
            fromName: joiningUser,
            fromId: joiningUserId,
            toId: originalRequestId,
          },
        });

        ee.emit("join", { joiningUser, joiningUserId, originalRequestId });
      }
    }),
  notifyAutomaticRequests: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      
      // when a request is found, emit the two users
      async function find({
        requestId,
        userId,
      }: {
        requestId: string;
        userId: string;
      }) {
        const req = await prismaPostgres.matchRequest.findUnique({
          where: {
            id: requestId,
          },
        });
        
        if (!req) return;
        const toRunSync = async () => {
          const other = await prismaPostgres.matchRequest.findFirst({
            where: {
              AND: {
                category: req.category,
                difficulty: req.difficulty,
                matchType: "AUTO",
                id: {
                  not: requestId,
                },
                userId: {
                  not: userId
                }
              }
            },
          });
          if (other) {
            await prismaPostgres.matchRequest.deleteMany({
              where: {
                userId: {
                  in: [userId, other.userId],
                },
              },
            });
          }
          return other;
          };
          const other = await mutex.runExclusive(toRunSync);
          if (!other) return;      
          ee.emit("findAutomatic", {
            user1Id: req.userId,
            user2Id: other.userId,
          });
      }
      await find({
        requestId: input.requestId,
        userId: ctx.session.user.id,
      })
    }),
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

  // Users confirm that they want to match with the other user
  confirmMatch: protectedProcedure
    .input(z.object({ acceptId: z.string(), requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { acceptId, requestId } = input;
      const r2 = await ctx.prismaPostgres.matchRequest.findUnique({
        where: {
          id: requestId,
        },
      });
      if (!r2)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to match requests",
        });
      await ctx.prismaPostgres.matchRequest.deleteMany({
        where: {
          OR: [
            {
              userId: r2.userId,
            },
            {
              userId: acceptId,
            },
          ],
        },
      });

      ee.emit("confirm", { user1Id: acceptId, user2Id: r2.userId });
      // needed for matching information
      return {
        user1Id: acceptId,
        user2Id: r2.userId,
      };
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

  declineMatch: protectedProcedure
    .input(z.object({ acceptId: z.string(), requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { acceptId, requestId } = input;

      await ctx.prismaPostgres.joinRequest.deleteMany({
        where: {
          fromId: acceptId,
          toId: requestId,
        },
      });

      ee.emit("decline", { acceptId, requestId });

      return {
        acceptId,
      };
    }),

  subscribeToDeclineRequests: protectedProcedure.subscription(() => {
    return observable<{ acceptId: string; requestId: string }>((emit) => {
      const onDecline = (data: { acceptId: string; requestId: string }) => {
        emit.next(data);
      };
      ee.on("decline", onDecline);
      return () => {
        ee.off("decline", onDecline);
      };
    });
  }),
});
