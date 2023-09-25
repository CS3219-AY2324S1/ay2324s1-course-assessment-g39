import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { prismaPostgres as prisma } from "~/server/db";
import { hashPassword } from "~/server/auth";
import bcrypt from "bcrypt";
import { TRPCError } from "@trpc/server";

const userObject = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string().nullable(),
  image: z.string().nullable(),
});

const userUpdateObject = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.date().nullable(),
  image: z.string().nullable(),
});

export const userRouter = createTRPCRouter({
  create: publicProcedure.input(userObject).mutation(async ({ ctx, input }) => {
    const { password, ...values } = input;
    if (!password) {
      return {
        message: "Invalid password",
      };
    }
    const passwordHash = await hashPassword(password);
    await ctx.prismaPostgres.user.create({
      data: {
        ...values,
        password: passwordHash,
      },
    });
    return {
      message: `User created`,
    };
  }),

  delete: protectedProcedure
    .input(
      z.object({
        email: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await ctx.prismaPostgres.user.delete({
        where: {
          email: input.email,
        },
      });
      return {
        message: "User deleted",
      };
    }),

  update: protectedProcedure
    .input(userUpdateObject)
    .mutation(async ({ ctx, input }) => {
      const { id, ...remainder } = input;
      await ctx.prismaPostgres.user.update({
        where: {
          id: id,
        },
        data: remainder,
      });

      return {
        message: "User updated",
      };
    }),

  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const usersByName = await ctx.prismaPostgres.user.findMany({
        take: 10,
        where: {
          name: input.username,
        },
      });

      return usersByName;
      // if (!user || !user.email) {
      //   throw new TRPCError({
      //     code: "INTERNAL_SERVER_ERROR",
      //     message: "User not found",
      //   });
      // }

      // return {
      //   ...user,
      //   email: user.email,
      // };
    }),

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: {
        id: ctx.session.user.id,
      },
    });

    if (!user || !user.email || !user.name) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "User not found",
      });
    }

    return {
      ...user,
      name: user.name,
      email: user.email,
    };
  }),
});
