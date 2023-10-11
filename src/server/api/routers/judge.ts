import axios from "axios";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// TODO: Multifile

type language = {
  id: number;
  name: string;
};

const executionObject = z.object({
  source_code: z.string(),
  language_id: z.number(),
  stdin: z.string().optional(),
});

export const judgeRouter = createTRPCRouter({
  getLanguages: protectedProcedure.query(async () => {
    return axios.get("http://localhost:2358/languages").then((res) => {
      return res.data as language[];
    });
  }),
  run: protectedProcedure.input(executionObject).mutation(async ({ input }) => {
    return axios
      .post(
        "http://localhost:2358/submissions/?base64_encoded=false&wait=true",
        input,
      )
      .then((res) => {
        return JSON.stringify(res.data, null, 2);
      });
  }),
});
