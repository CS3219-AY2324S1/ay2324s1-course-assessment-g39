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
  dbHealthCheck: publicProcedure.query(async ({ ctx }) => {
    try {
      await ctx.prismaMongo.$connect();
      return true;
    } catch {
      return false;
    }
  }),
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.prismaMongo.question.findMany();
  }),
  getAllReduced: publicProcedure.query(({ ctx }) => {
    return ctx.prismaMongo.question.findMany({
      select: {
        title: true,
        id: true,
      },
    });
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
