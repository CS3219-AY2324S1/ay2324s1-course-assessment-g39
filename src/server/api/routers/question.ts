import { z } from "zod";

import { createTRPCRouter, publicProcedure, maintainerProcedure } from "~/server/api/trpc";



const questionObject = z.object({
  title: z.string(),
  body: z.string(),
  difficulty: z.number(),
  category: z.string(),
});

const questionUpdateObject = z.object({
  id: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
  difficulty: z.number().optional(),
  category: z.string().optional(),
});

export const questionRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prismaMongo.question.findMany();
  }),

  addOne: maintainerProcedure
    .input(questionObject)
    .mutation(async ({ ctx, input }) => {
      const q = await ctx.prismaMongo.question.create({
        data: {
          ...input,
        },
      });
      return {
        message: `Question created: ${input.title}`,
        id: q.id,
      };
    }),

  updateOne: maintainerProcedure
    .input(questionUpdateObject)
    .mutation(async ({ ctx, input }) => {
      const { id, ...remainder } = input;
      await ctx.prismaMongo.question.update({
        where: {
          id: id,
        },
        data: remainder,
      });
      return {
        message: `Question updated: ${input.title}`,
      };
    }),

  deleteOne: maintainerProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prismaMongo.question.delete({
        where: {
          id: input.id,
        },
      });
      return {
        message: `Question deleted`,
      };
    }),
});
