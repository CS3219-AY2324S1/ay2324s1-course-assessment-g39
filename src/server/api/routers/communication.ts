/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const ee = new EventEmitter();

export type Message = {
  sessionId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: Date;
};

// Methods include userId as well because users do not have unique names, so who is typing is decided by the userId
export const messagesRouter = createTRPCRouter({
  getAllSessionMessages: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { sessionId } = input;

      const messages = await ctx.prismaPostgres.sessionMessage.findMany({
        where: {
          sessionId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      return messages;
    }),

  addMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        senderId: z.string(),
        senderName: z.string(),
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, senderId, senderName, message } = input;

      const messageObject = await ctx.prismaPostgres.sessionMessage
        .create({
          data: {
            sessionId,
            senderId,
            senderName,
            message,
          },
        })
        .then((req) => {
          return req;
        });

      ee.emit("message", messageObject);

      return messageObject;
    }),

  subscribeToSessionMessages: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .subscription(({ input }) => {
      return observable<Message>((emit) => {
        const onMessage = (data: Message) => {
          if (data.sessionId === input.sessionId) emit.next(data);
        };
        ee.on("message", onMessage);
        return () => {
          ee.off("message", onMessage);
        };
      });
    }),

  addWhoIsTyping: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        userName: z.string(),
        isTyping: z.boolean(),
      }),
    )
    .mutation(({ input }) => {
      ee.emit("typing", input);

      return input;
    }),

  subscribeToWhoIsTyping: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
      }),
    )
    .subscription(({ input }) => {
      return observable<{
        otherUser: string;
        isTyping: boolean;
      }>((emit) => {
        const onTyping = (data: {
          sessionId: string;
          userId: string;
          userName: string;
          isTyping: boolean;
        }) => {
          if (
            data.sessionId === input.sessionId &&
            data.userId !== input.userId
          )
            emit.next({ otherUser: data.userName, isTyping: data.isTyping });
        };
        ee.on("typing", onTyping);
        return () => {
          ee.off("typing", onTyping);
        };
      });
    }),
});
