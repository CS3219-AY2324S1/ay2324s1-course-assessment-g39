import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import UserRequestHandler from "~/components/collab/UserRequestHandler";

const userObject = z.object({
  difficulty: z.number().min(0).max(5),
  category: z.string(),
  id: z.string(),
});

export const matchRequestRouter = createTRPCRouter({
  addRequest: publicProcedure.input(userObject).mutation(async ({ input }) => {
    const { difficulty, category, id } = input;

    const requestHandler = new UserRequestHandler();

    const response = await requestHandler
      .sendRequest({ difficulty, category, id })
      .then((res) => {
        return res;
      });

    return response;
  }),

  cancelRequest: publicProcedure
    .input(userObject)
    .mutation(async ({ input }) => {
      const { difficulty, category, id } = input;

      const requestHandler = new UserRequestHandler();

      const response = await requestHandler
        .cancelRequest({
          difficulty,
          category,
          id,
        })
        .then((res) => {
          return res;
        });

      return response;
    }),
});
