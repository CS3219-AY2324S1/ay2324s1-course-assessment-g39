/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const userObject = z.object({
  id: z.string(),
  name: z.string(),
  difficulty: z.number().min(0).max(5),
  category: z.string(),
});

const acceptRequestObject = z.object({
  acceptUser: z.string(),
  acceptId: z.string(),
  requestId: z.string(),
});

type UserRequest = {
  id: string;
  name: string;
  difficulty: number;
  category: string;
};

const ee = new EventEmitter();

export const matchRequestRouter = createTRPCRouter({
  getOtherRequests: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prismaPostgres.matchRequest.findMany({
      where: {
        id: { not: ctx.session?.user.id },
      },
    });
  }),

  getJoinRequests: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prismaPostgres.joinRequest.findMany({
      where: {
        toId: ctx.session?.user.id,
      },
    });
  }),

  addRequest: publicProcedure
    .input(userObject)
    .mutation(async ({ ctx, input }) => {
      const { id, name, difficulty, category } = input;

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
        };
      }

      const request = await ctx.prismaPostgres.matchRequest
        .create({
          data: {
            id,
            name,
            difficulty,
            category,
          },
        })
        .then((req) => {
          return req;
        });

      ee.emit("add", request);

      return {
        msg: "Searching for partner...",
        partner: "",
        isSuccess: true,
      };
    }),

  cancelRequest: publicProcedure
    .input(userObject)
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

  subscribeToAllRequests: publicProcedure.subscription(() => {
    return observable<UserRequest>((emit) => {
      const onAdd = (data: UserRequest) => {
        emit.next(data);
      };
      const onRemove = (data: UserRequest) => {
        emit.next(data);
      };
      ee.on("add", onAdd);
      ee.on("remove", onRemove);
      return () => {
        ee.off("add", onAdd);
        ee.off("remove", onRemove);
      };
    });
  }),

  // Users want to match with other user
  acceptRequest: publicProcedure
    .input(acceptRequestObject)
    .mutation(async ({ ctx, input }) => {
      const { acceptUser, acceptId, requestId } = input;

      const existingRequest = await ctx.prismaPostgres.joinRequest
        .findFirst({
          where: {
            fromName: acceptUser,
            fromId: acceptId,
            toId: requestId,
          },
        })
        .then((req) => {
          return req;
        });

      if (!existingRequest) {
        await ctx.prismaPostgres.joinRequest.create({
          data: {
            fromName: acceptUser,
            fromId: acceptId,
            toId: requestId,
          },
        });

        ee.emit("accept", { acceptUser, acceptId, requestId });
      }
    }),

  // Users listens to other users who want to join their session
  subscribeToAcceptRequests: publicProcedure.subscription(() => {
    return observable<{
      acceptUser: string;
      acceptId: string;
      requestId: string;
    }>((emit) => {
      const onAccept = (data: {
        acceptUser: string;
        acceptId: string;
        requestId: string;
      }) => {
        emit.next(data);
      };
      ee.on("accept", onAccept);
      return () => {
        ee.off("accept", onAccept);
      };
    });
  }),

  // Users confirm that they want to match with the other user
  confirmMatch: publicProcedure
    .input(z.object({ acceptId: z.string(), requestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { acceptId, requestId } = input;

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
    }),

  // Users listens for confirmation from other user to join the session
  subscribeToConfirmation: publicProcedure.subscription(() => {
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

  declineMatch: publicProcedure
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

  subscribeToDeclineRequests: publicProcedure.subscription(() => {
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
