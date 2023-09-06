import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

import { prismaPostgres as prisma } from '~/server/db';


const userObject = z.object({
  name: z.string(),
  email: z.string()
});

const userUpdateObject = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.date().nullable(),
  image: z.string().nullable()
});

export const userRouter = createTRPCRouter({
  create: publicProcedure
    .input(userObject)
    .mutation(async ({ input }) => {
      await prisma.user.create({
        data: {
          ...input
        }
      })
      return {
        message: `User created`
      }
    }),
    delete: protectedProcedure
      .input(z.object({
        email: z.string()
      }))
      .query(async ({ input }) => {
        await prisma.user.delete({
          where: {
            email: input.email
          }
        });
        return {
          message: "User deleted"
        }
      }),
    update: protectedProcedure
      .input(userUpdateObject)
      .mutation(async ({ input }) => {
        const {id, ...remainder} = input;
        await prisma.user.update({
          where: {
            id: id,
          },
          data: remainder,
          });
        return {
          message: "User updated"
        }
      })
});


