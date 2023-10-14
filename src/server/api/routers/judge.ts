import axios from "axios";
import { number, z } from "zod";
import {
  createTRPCRouter,
  maintainerProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

// TODO: Multifile

type Language = {
  id: number;
  name: string;
};

type Output = {
  stdout: string | null;
  time: string;
  memory: number;
  stderr: string | null;
  token: string;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
};

const testCaseExecutionObject = z.object({
  source_code: z.string(),
  testCaseId: z.string(),
});

const executionObject = z.object({
  source_code: z.string(),
  language_id: z.number(),
  stdin: z.string().optional(),
  expected_output: z.string().optional(),
  cpu_time_limit: z.number().optional(),
  memory_limit: z.number().optional(),
  // compiler_options: z.string().optional(),
  // cpu_extra_time: z.number().optional(),
});

export const judgeRouter = createTRPCRouter({
  getLanguages: maintainerProcedure.query(async () => {
    return axios.get("http://localhost:2358/languages").then((res) => {
      return res.data as Language[];
    });
  }),
  getSpecificLanguages: protectedProcedure
    .input(z.object({ languages: z.array(z.number()) }))
    .query(async ({ input }) => {
    const languageIdSet = new Set<number>();
    input.languages.forEach((val) => languageIdSet.add(val));
    return axios.get("http://localhost:2358/languages").then((res) => {
      return (res.data as Language[]).filter((value) => languageIdSet.has(value.id));
    });
  }),
  run: maintainerProcedure
    .input(executionObject)
    .mutation(async ({ input }) => {
      return axios
        .post(
          "http://localhost:2358/submissions/?base64_encoded=false&wait=true",
          input,
        )
        .then((res) => {
          return res.data as Output;
        });
    }),
  runTestCase: protectedProcedure
    .input(testCaseExecutionObject)
    .mutation(async ({ ctx, input }) => {
      const { source_code, testCaseId } = input;
      const testCase = await ctx.prismaMongo.testCase.findUnique({
        where: {
          id: testCaseId,
        },
      });
      if (!testCase) {
        throw new Error(`Test case ${testCaseId} not found`);
      }
      const environment = await ctx.prismaMongo.environment.findUnique({
        where: {
          id: testCase.environmentId,
        },
      });
      if (!environment) {
        throw new Error(`Environment ${testCase.environmentId} not found`);
      }
      const pendedSourceCode = `${environment.prepend}\n${source_code}\n${environment.append}\n${testCase.test}`;
      const newInput = {
        source_code: pendedSourceCode,
        language_id: environment.languageId,
        stdin: testCase.input,
        stdout: testCase.output,
        cpu_time_limit: testCase.timeLimit,
        memory_limit: testCase.memoryLimit
          ? Math.max(testCase.memoryLimit, 2048)
          : undefined,
      };
      return axios
        .post(
          "http://localhost:2358/submissions/?base64_encoded=false&wait=true",
          newInput,
        )
        .then((res) => {
          return res.data as Output;
        });
    }),
});
