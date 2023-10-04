import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { api } from "~/utils/api";

const userObject = z.object({
  id: z.string(),
  name: z.string(),
  difficulty: z.number().min(0).max(5),
  category: z.string(),
});

type UserRequest = {
  id: string;
  name: string;
  difficulty: number;
  category: string;
};

type RequestResponse = {
  msg: string;
  partner: string;
  isSuccess: boolean;
};

const ee = new EventEmitter();

export const matchRequestRouter = createTRPCRouter({
  getRequests: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prismaPostgres.matchRequest.findMany({});
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

  subscribeToRequests: publicProcedure.subscription(() => {
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
});
