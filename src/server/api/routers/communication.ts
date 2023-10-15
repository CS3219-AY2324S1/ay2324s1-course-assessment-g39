/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const ee = new EventEmitter();

type Message = {
  codeSessionId: string;
  message: string;
  name: string;
  userId: string;
};

// Methods include userId as well because users do not have unique names, so who is typing is decided by the userId
export const messagesRouter = createTRPCRouter({
  addMessage: protectedProcedure
    .input(
      z.object({
        codeSessionId: z.string(),
        message: z.string(),
        name: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(({ input }) => {
      ee.emit("message", input);

      return input;
    }),

  subscribeToSessionMessages: protectedProcedure
    .input(z.object({ codeSessionId: z.string() }))
    .subscription(({ input }) => {
      return observable<Message>((emit) => {
        const onMessage = (data: Message) => {
          if (data.codeSessionId === input.codeSessionId) emit.next(data);
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
        codeSessionId: z.string(),
        name: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(({ input }) => {
      ee.emit("typing", input);

      return input;
    }),

  subscribeToWhoIsTyping: protectedProcedure
    .input(z.object({ codeSessionId: z.string() }))
    .subscription(({ input }) => {
      return observable<{
        codeSessionId: string;
        name: string;
        userId: string;
      }>((emit) => {
        const onTyping = (data: {
          codeSessionId: string;
          name: string;
          userId: string;
        }) => {
          if (data.codeSessionId === input.codeSessionId) emit.next(data);
        };
        ee.on("typing", onTyping);
        return () => {
          ee.off("typing", onTyping);
        };
      });
    }),
});
