import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { TRPCError } from "@trpc/server";
import { hashPassword } from "~/server/auth";
import { prismaPostgres as prisma } from "~/server/db";

// zod object does stricter runtime validation of types compared to
// typescript's type in `import { type User } from "@prisma-db-psql/client`
// --- requires manual updating when schema changes
const id_z = z.string().min(1); // can add error message
const name_z = z.string().min(1);
const email_z = z.string().email().min(1);
const emailVerified_z = z.date().nullable();
const image_z = z.string().nullable();
const password_z = z.string().min(6);
const role_z = z.enum(["MAINTAINER", "USER"]).nullable();

const userCreateInput_z = z.object({
  name: name_z,
  email: email_z,
  password: password_z,
  image: image_z,
  role: role_z,
});

const userUpdateInfoInput_z = z.object({
  id: id_z,
  name: name_z,
  email: email_z,
  // TODO: add email verification
  // emailVerified: z.date().nullable(),
  image: image_z,
});

const userUpdatePasswordInput_z = z.object({
  id: id_z,
  password: password_z,
});

export const userRouter = createTRPCRouter({
  create: publicProcedure
    .input(userCreateInput_z)
    .mutation(async ({ input }) => {
      const { password, role, ...values } = input;
      const passwordHash = await hashPassword(password);
      try {
        await prisma.user.create({
          data: {
            role: role ?? undefined,
            ...values,
            password: passwordHash,
          },
        });
      } catch (e) {
        // throws generic error to prevent malicious actors from
        // determining which emails are in the databse
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An internal error occurred. Please try again later.",
        });
      }
    }),

  deleteUserByID: protectedProcedure
    .input(z.object({ id: id_z }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prismaPostgres.user.delete({
        where: { id: input.id },
      });
      return {
        message: "User deleted",
      };
    }),

  update: protectedProcedure
    .input(userUpdateInfoInput_z)
    .mutation(async ({ ctx, input }) => {
      const { id, ...otherDetails } = input;
      await ctx.prismaPostgres.user.update({
        where: { id: id },
        data: otherDetails,
      });
    }),

  updatePassword: protectedProcedure
    .input(userUpdatePasswordInput_z)
    .mutation(async ({ ctx, input }) => {
      const { id, password } = input;
      const passwordHash = await hashPassword(password);
      await ctx.prismaPostgres.user.update({
        where: { id: id },
        data: { password: passwordHash },
      });
    }),
});

export { id_z, name_z, email_z, emailVerified_z, image_z, password_z };
