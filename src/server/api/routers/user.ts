import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { TRPCError } from "@trpc/server";
import { hashPassword } from "~/server/auth";
import { prismaPostgres as prisma } from "~/server/db";

const userObject = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string().min(6),
  image: z.string().nullable(),
  role: z.enum(["MAINTAINER", "USER"]).nullable()
});

const userUpdateObject = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  // TODO: add email verification
  // emailVerified: z.date().nullable(),
  image: z.string().nullable(),
});

export const userRouter = createTRPCRouter({
  create: publicProcedure.input(userObject).mutation(async ({ input }) => {
    const { password, ...values } = input;
    const passwordHash = await hashPassword(password);
    try {
      await prisma.user.create({
        data: {
          ...values,
          password: passwordHash,
        },
      });
    } catch (e) {
      // throws generic error to prevent malicious actors from determining which emails are in the databse
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An internal error occurred. Please try again later.",
      });
    }
  }),

  deleteUserByID: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prismaPostgres.user.delete({
        where: { id: input.id },
      });
      return {
        message: "User deleted",
      };
    }),

  update: protectedProcedure
    .input(userUpdateObject)
    .mutation(async ({ ctx, input }) => {
      const { id, ...otherDetails } = input;
      await ctx.prismaPostgres.user.update({
        where: { id: id },
        data: otherDetails,
      });
    }),

  updatePassword: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, password } = input;
      const passwordHash = await hashPassword(password);
      await ctx.prismaPostgres.user.update({
        where: { id: id },
        data: { password: passwordHash },
      });
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
    }),

  // getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
  //   const user = await prisma.user.findUnique({
  //     where: {
  //       id: ctx.session.user.id,
  //     },
  //   });

  //   if (!user?.email || !user.name) {
  //     throw new TRPCError({
  //       code: "INTERNAL_SERVER_ERROR",
  //       message: "User not found",
  //     });
  //   }

  //   return {
  //     ...user,
  //     name: user.name,
  //     email: user.email,
  //   };
  // }),
});
