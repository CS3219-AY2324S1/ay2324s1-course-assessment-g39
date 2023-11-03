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
    .input(z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(100).nullable(), titleFilter: z.string().optional() }))
    .query(
      async ({input, ctx}) => {
        const limit = input.limit ?? 50;
        const totalCount = await ctx.prismaMongo.question.count({
          where: input.titleFilter ? {
            OR: [
              {
                title: {
                  contains: input.titleFilter
                },
              },
              {
                body: {
                  contains: input.titleFilter
                }
              }
            ]
          } : undefined,
        });
        const items = await ctx.prismaMongo.question.findMany({
          take: limit + 1,
          where: input.titleFilter ? {
            title: {
              contains: input.titleFilter
            }
          } : undefined,
          cursor: input.cursor ? {
            title: input.cursor
          } : undefined,
          orderBy: {
            title: 'asc'
          }
        });
        let nextCursor: string | undefined = undefined;
        if (items.length === limit + 1) {
          const top = items.pop();
          nextCursor = top!.title;
        }
        return {
          items, nextCursor, totalCount
        };
      }
    ),
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
