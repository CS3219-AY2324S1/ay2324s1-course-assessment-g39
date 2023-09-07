import { z } from "zod";

import { observable } from "@trpc/server/observable";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const userObject = z.object({
  id: z.number(),
});

const userQueue: string[] = [];

export const matchUsersRouter = createTRPCRouter({
  matchSubscription: publicProcedure.subscription(({ ctx }) => {
    return observable<string>((emit) => {
      const { emitter } = ctx;

      const addToQueue = () => {
        if (ctx.session) userQueue.push(ctx.session.user.id);
      };

      emitter.on("lookForMatch", addToQueue);

      const interval = setInterval(() => {
        if (userQueue.length >= 2) {
          const ids = userQueue.shift()?.concat(" " + userQueue.shift());
          if (ids) emit.next(ids);
        }
      }, 1000);

      return () => {
        clearInterval(interval);
        emitter.off("lookForMatch", addToQueue);
      };
    });
  }),

  lookForMatch: publicProcedure.input(userObject).query(({ ctx }) => {
    const { emitter } = ctx;

    emitter.emit("lookForMatch");
  }),
});
