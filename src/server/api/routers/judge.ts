import axios from "axios";
import { number, z } from "zod";
import {
  createTRPCRouter,
  maintainerProcedure,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { prismaMongo, prismaPostgres } from "~/server/db";
import { AnswerResult } from "@prisma-db-psql/client";
import { TRPCClientError } from "@trpc/client";
import { TRPCError } from "@trpc/server";

// TODO: Multifile

type Language = {
  id: number;
  name: string;
};

type BatchSubmissionOutput = {
  token: string;
}[];


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


type BatchSubmissionRequestOutput = {
  submissions:  Output[]
};

const judgeStatusCodeMap = new Map<number, AnswerResult>([
  [3, "ACCEPTED"],
  [4, "WRONG_ANSWER"],
  [5, "TIME_LIMITED_ERROR"],
  [6, "COMPILE_ERROR"],
  [13, "JUDGE_ERROR"],
  [14, "JUDGE_ERROR"]
]);



function fromStatusCode(code: number): AnswerResult | "WAITING" | "PROCESSING" {
  
  if (code === 2) {
    return "PROCESSING";
  }
  if (code == 1 || code == 0) {
    return "WAITING";
  }
  if (code >= 7 && code <= 11) {
    return "RUNTIME_ERROR";
  }
  if (!judgeStatusCodeMap.has(code)) {
    return "JUDGE_ERROR";
  }
  return judgeStatusCodeMap.get(code)!;
}


async function getLanguageFromCode(code: number): Promise<string> {
  const languages = await axios
    .get("http://localhost:2358/languages")
    .then((res) => {
      return res.data as { id: number; name: string }[];
    });

  return languages?.find((l) => l.id === code)?.name ?? "";

}

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
        expected_output: testCase.output,
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
    checkAnswer: protectedProcedure
      .input(z.object({ submissionId: z.string() }))
      .query(async ({ ctx, input }) => {
        // check if question attempt already exists
        const questionAttempt = await ctx.prismaPostgres.questionAttempt.findUnique({
          where: {
            userId_submissionId: {
              userId: ctx.session.user.id,
              submissionId: input.submissionId
            }
          }
        })
        if (questionAttempt) {
          return {
            status: questionAttempt.result,
            complete: true,
            numOfTests: questionAttempt.numOfTests,
            passed: questionAttempt.passed
          };
        }
        const submission = await ctx.prismaPostgres.submission.findUnique({
          where: {
            userId_id: {
              userId: ctx.session.user.id,
              id: input.submissionId
            }
          }
        });
        const answer = await ctx.prismaMongo.answer.findUnique({
          where: {
            id: submission?.answerId
          },
          include: {
            environment: true
          }
        });
        if (!submission || !answer) throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to find submission" });
        
        const tokens = submission.token.join(',');
        const status = await axios.get(`http://localhost:2358/submissions/batch?tokens=${tokens}&base64_encoded=false`);
        // check if we finished evaluation
        const result = status.data as BatchSubmissionRequestOutput;
        let currentStatus: AnswerResult = "ACCEPTED";
        let passed = 0;
        for (const submission of result.submissions) {
          const status = fromStatusCode(submission.status.id);
          if (status === "WAITING" || status === "PROCESSING") {
            return {
              complete: false,
              passed,
              status: "WAITING",
              numOfTests: result.submissions.length
            }
          }
          if (status !== "ACCEPTED") {
            // return the first error
            currentStatus = status;
            break;
          }
          passed += 1;
        }
        await prismaPostgres.questionAttempt.create({
          data: {
            userId: ctx.session.user.id,
            answerId: submission.answerId,
            language: await getLanguageFromCode(answer.environment.languageId),
            result: currentStatus,
            questionId: answer.environment.questionId,
            passed,
            numOfTests: result.submissions.length,
            submissionId: input.submissionId,
          }
        });

        await prismaPostgres.submission.delete({
          where: {
            userId_id: {
              userId: ctx.session.user.id,
              id: input.submissionId,
            }
          }
        })

        return {
          status: currentStatus,
          passed,
          complete: true,
          numOfTests: result.submissions.length,
          values: result,
        }

      }),
    submitCode: 
      protectedProcedure
        .input(z.object({ source_code: z.string(), environmentId: z.string()}))
        .mutation(async ({ ctx, input }) => {
          // create a submissions batch for all the test cases
          // which satisfy the envid
          const { source_code, environmentId } = input;
          const environment = await prismaMongo.environment.findUnique({
            where: {
              id: environmentId,
            }
          });
          if (!environment) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid environmentId"
            });
          }
          const testCases = await prismaMongo.testCase.findMany({
            where: {
              environmentId
            }
          });
          const judgeInput = testCases.map((testCase) => ({
            source_code: `${environment.prepend}\n${source_code}\n${environment.append}\n${testCase.test}`,
            language_id: environment.languageId,
            stdin: testCase.input,
            expected_output: testCase.output,
            cpu_time_limit: testCase.timeLimit,
            memory_limit: testCase.memoryLimit
              ? Math.max(testCase.memoryLimit, 2048)
              : undefined,
          }));

          
          const request = (await axios
          .post(
            "http://localhost:2358/submissions/batch?base64_encoded=false",
            {
              submissions: judgeInput
            },
          ))
          const result = request.data as BatchSubmissionOutput;
          const answer = await prismaMongo.answer.create({
            data: {
              body: source_code,
              envId: environmentId
            }
          });
          // place this submission in memory 
          const submission = await prismaPostgres
            .submission.create({
              data: {
                token: result.map(({ token }) => token),
                userId: ctx.session.user.id,
                answerId: answer.id
              }
            });

          return {
            submissionId: submission.id
          };
        })
});
