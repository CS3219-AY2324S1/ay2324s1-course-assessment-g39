/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import OpenAI from "openai";
import type { ChatCompletionRole } from "openai/resources";

const ee = new EventEmitter();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type UserAndAIMessage = {
  id?: string;
  sessionId: string;
  userId: string;
  message: string;
  role: ChatCompletionRole;
  createdAt?: Date;
};

export const userAndAIMessagesRouter = createTRPCRouter({
  getAllSessionUserAndAIMessages: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { sessionId, userId } = input;

      const messages =
        await ctx.prismaPostgres.sessionUserAndAIMessage.findMany({
          where: {
            sessionId,
            userId,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

      return messages;
    }),

  addUserAndAIMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, userId, message } = input;

      const messageObject =
        await ctx.prismaPostgres.sessionUserAndAIMessage.create({
          data: {
            sessionId,
            userId,
            message,
            role: "user",
          },
        });

      const currentSessionMessages =
        await ctx.prismaPostgres.sessionUserAndAIMessage.findMany({
          where: {
            sessionId,
            userId,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

      const response = await openai.chat.completions.create({
        messages: currentSessionMessages.map((message) => {
          return {
            role: message.role as ChatCompletionRole,
            content: message.message,
          };
        }),
        model: "gpt-3.5-turbo",
      });

      const aiMessage = response.choices[0]?.message;

      if (aiMessage) {
        const aiMessageObject =
          await ctx.prismaPostgres.sessionUserAndAIMessage.create({
            data: {
              sessionId,
              userId,
              message: aiMessage.content!,
              role: aiMessage.role,
            },
          });

        ee.emit("aiMessage", aiMessageObject);
      }

      return messageObject;
    }),

  subscribeToSessionUserAndAIMessages: protectedProcedure
    .input(z.object({ sessionId: z.string(), userId: z.string() }))
    .subscription(({ input }) => {
      return observable<UserAndAIMessage>((emit) => {
        const onMessage = (data: UserAndAIMessage) => {
          if (
            data.sessionId === input.sessionId &&
            data.userId === input.userId
          )
            emit.next(data);
        };
        ee.on("aiMessage", onMessage);
        return () => {
          ee.off("aiMessage", onMessage);
        };
      });
    }),
});
