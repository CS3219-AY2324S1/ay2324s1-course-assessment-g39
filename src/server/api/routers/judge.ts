import axios from "axios";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

type language = {
    id: number;
    name: string;
};

const executionObject = z.object({
  code: z.string(),
  language: z.string(),
  stdin: z.string().optional(),
});

export const judgeRouter = createTRPCRouter({
    getLanguages: protectedProcedure.query(async () => {
        return axios.get("http://localhost:2358/languages").then((res) => {
            return res.data as language[];
        });
    }),
    // run: protectedProcedure.input(executionObject).mutation(async ({ ctx, input }) => {
    //     https.get("https://localhost:/submissions", {
});
