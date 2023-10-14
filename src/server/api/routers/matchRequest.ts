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
import { MatchType } from "@prisma-db-psql/client"

const userObject = z.object({
  id: z.string(),
  name: z.string(),
  difficulty: z.number().min(0).max(5),
  category: z.string(),
  matchType: z.enum(["AUTO", "MANUAL"])
});

const addJoinRequestObject = z.object({
  joiningUser: z.string(),
  joiningUserId: z.string(),
  originalRequestId: z.string(),
});

type UserRequest = {
  id: string;
  name: string;
  difficulty: number;
  category: string;
};

const ee = new EventEmitter();

export const matchRequestRouter = createTRPCRouter({
  getAllOtherRequests: protectedProcedure
  .query(async ({ ctx }) => {
    const requests = await ctx.prismaPostgres.matchRequest.findMany({
      where: {
        NOT: [
          {
            OR: [
              {
                userId: ctx.session.user.id
              },
              {
                matchType: "AUTO"
              }
            ]
          }
        ]
      }
    });
    return {
      requests,
      count: await ctx.prismaPostgres.matchRequest.count()
    }

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
      }
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
          requestId: existingRequest.id
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
            matchType
          },
        })
        .then((req) => {
          return req;
        });

      ee.emit("add", request);

      return {
        msg: request.matchType == "MANUAL" ? "Room created" : "Searching for partner...",
        partner: "",
        isSuccess: true,
        difficulty,
        category,
        requestId: request.id
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
        difficulty: z.number().min(0).max(5),
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
    return observable<UserRequest & {
      mode: "add" | "remove" | "update"
    }>((emit) => {
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
          mode: "update"
        })
      }
      ee.on("update", onUpdate)
      ee.on("add", onAdd);
      ee.on("remove", onRemove);
      return () => {
        ee.off("add", onAdd);
        ee.off("remove", onRemove);
        ee.off("update", onUpdate)
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
      .mutation(({ ctx, input }) => {
        ee.emit("findAutomatic", { requestId: input.requestId, userId: ctx.session.user.id })
      })
      ,
  /**
   * Endpoint needed to ensure that no too users are matched repeatedly
   */
  subscribeToAutomaticRequests: protectedProcedure  
    .subscription(({ ctx }) => {
      return observable<{user1Id: string, user2Id: string}>((emit) => {
        // when a request is found, emit the two users
        async function find({requestId, userId}: { requestId: string, userId: string}) {
          const req = await prismaPostgres.matchRequest.findUnique({
            where: {
              id: requestId
            }
          });
          if (!req) return;
          const other = await prismaPostgres.matchRequest.findFirst({
            where: {
              category: req.category,
              difficulty: req.difficulty,
              matchType: "AUTO",
              NOT: {
                id: requestId
              }
            }
          });
          if (other) {
            await prismaPostgres.matchRequest.deleteMany({
              where: {
                userId: {
                  in: [userId, other.userId]
                }
              }
            });

            emit.next({
              user1Id: ctx.session.user.id,
              user2Id: other.id
            });
          }
        }
        const findSync = (arg1: { requestId: string, userId: string }) => {
          console.log(arg1);
          void find(arg1);
        }
        ee.on("findAutomatic", findSync);
        return () => {
          ee.off("findAutomatic", findSync);
        }
      })
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
      const r1 = await ctx.prismaPostgres.matchRequest.findUnique({
        where: {
          id: acceptId,
        }
      });
      const r2 = await ctx.prismaPostgres.matchRequest.findUnique({
        where: {
          id: requestId
        }
      })
      if (!r1 || !r2) throw new TRPCError({
        code: "BAD_REQUEST", 
        message: "Failed to match requests"
      })
      await ctx.prismaPostgres.matchRequest.deleteMany({
        where: {
          id: { in: [acceptId, requestId] },
        },
      });

      await ctx.prismaPostgres.joinRequest.deleteMany({
        where: {
          fromId: { in: [acceptId, requestId] },
          toId: { in: [acceptId, requestId] },
        },
      });
      
      ee.emit("confirm", { acceptId, requestId });
      // needed for matching information
      return {
        user1Id: r1.userId,
        user2Id: r2.userId
      }
    }),

  // Users listens for confirmation from other user to join the session
  subscribeToConfirmation: protectedProcedure.subscription(() => {
    return observable<{ acceptId: string; requestId: string }>((emit) => {
      const onConfirm = (data: { acceptId: string; requestId: string }) => {
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
