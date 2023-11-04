import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  maintainerProcedure,
} from "~/server/api/trpc";
import { difficulties } from "../../../types/global";

const questionObject = z.object({
  title: z.string(),
  body: z.string(),
  difficulty: z.enum(difficulties),
  category: z.string(),
});

const questionUpdateObject = z.object({
  id: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
  difficulty: z.enum(difficulties).optional(),
  category: z.string().optional(),
});

export const questionRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prismaMongo.question.findMany();
  }),
  /**
   * Used to get only the first 100 questions
   */
  getAllReduced: publicProcedure.query(({ ctx }) => {
    return ctx.prismaMongo.question.findMany({
      take: 100,
      select: {
        title: true,
        id: true,
        category: true,
        difficulty: true,
      },
    });
  }),
  getAllReducedInfinite: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).optional(),
        titleFilter: z.string().optional(),
        backwards: z.boolean().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { limit = 50, titleFilter, backwards, cursor } = input;
      const totalCount = await ctx.prismaMongo.question.count({
        where: titleFilter
          ? {
              OR: [
                { title: { contains: titleFilter } },
                { body: { contains: titleFilter } },
              ],
            }
          : undefined,
      });
      const items = await ctx.prismaMongo.question.findMany({
        take: backwards ? -limit : limit,
        skip: cursor ? 1 : 0,
        where: titleFilter
          ? {
              OR: [
                { title: { contains: titleFilter } },
                { body: { contains: titleFilter } },
              ],
            }
          : undefined,
        cursor: cursor ? { title: cursor } : undefined,
        orderBy: {
          title: "asc",
        },
      });
      const hasNext = await ctx.prismaMongo.question.count({
        where: {
          title: {
            gt: items[items.length - 1]?.title,
          },
        },
      });
      const hasPrev = await ctx.prismaMongo.question.count({
        where: {
          title: {
            lt: items[0]?.title,
          },
        },
      });
      return { items, hasNext, hasPrev, totalCount };
    }),
  addOne: maintainerProcedure
    .input(questionObject)
    .mutation(async ({ ctx, input }) => {
      await ctx.prismaMongo.question.create({
        data: { ...input },
      });

      return { title: input.title };
    }),

  updateOne: maintainerProcedure
    .input(questionUpdateObject)
    .mutation(async ({ ctx, input }) => {
      const { id, ...remainder } = input;
      await ctx.prismaMongo.question.update({
        where: { id: id },
        data: remainder,
      });
      return {
        title: input.title,
        id: input.id,
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

  getOne: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prismaMongo.question.findUnique({
        where: {
          id: input.id,
        },
      });
    }),

  getOneEnvironments: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prismaMongo.environment.findMany({
        where: {
          questionId: input.id,
        },
      });
    }),

  getOneEnvironmentTestCases: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prismaMongo.testCase.findMany({
        where: {
          environmentId: input.id,
        },
      });
    }),
  deleteTestCase: maintainerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prismaMongo.testCase.delete({
        where: {
          id: input.id,
        },
      });
    }),
  createTestCase: maintainerProcedure
    .input(
      z.object({
        description: z.string(),
        hint: z.string(),
        test: z.string(),
        input: z.string().optional(),
        output: z.string().optional(),
        timeLimit: z.number(),
        memoryLimit: z.number(),
        environmentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prismaMongo.testCase.create({
        data: {
          ...input,
        },
      });
    }),
});
