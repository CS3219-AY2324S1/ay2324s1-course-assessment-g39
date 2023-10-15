import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CodeOutput, Language, Question, TestCase } from "~/types/global";
import { api } from "~/utils/api";

type UseQuestionsReturn = {
  output: CodeOutput | undefined;
  template: string;
  /**
   * List of questions
   */
  questionTitleList: { title: string; id: string }[];
  testCaseIdList: { description: string; id: string }[];
  /**
   * The current selected question in formated markdown
   */
  currentQuestion: Question | undefined | null;
  currentTestCase: TestCase | undefined;
  /**
   * Submits code with the given language and number
   */
  runSelecteTestCase: (code: string) => void;
  /**
   * Indicates if the submitted code is still running
   */
  loading: boolean;
  /**
   * Set question
   */
  setQuestionId: (questionTitle: string) => void;

  setTestCaseId: (testCaseId: string) => void;
  languages: Language[];
  currentLanguage: Language | undefined;
  setCurrentLanguage: (lang: Language) => void;
  environmentId: string;
};

// just grabbing questions from repo
export default function useQuestions(): UseQuestionsReturn {
  const [questionId, setQuestionId] = useState("");
  // todo: impl loading when running
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<CodeOutput | undefined>(undefined);
  const [testCaseId, setTestCaseId] = useState<string>("");
  const [testCaseIdList, setTestCaseIdList] = useState<
    {
      description: string;
      id: string;
    }[]
  >([]);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const questions =
    api.question.getAllReduced.useQuery(undefined, {
      onError: (e) => {
        toast.error("Failed to fetch questions: " + e.message);
      },
      onSuccess: (data) => {
        setQuestionId(data[0]?.id ?? "");
      },
      refetchOnWindowFocus: false,
    }).data ?? [];
  const question = api.question.getOne.useQuery({
    id: questionId,
  });

  const environmentsQuery =
    api.question.getOneEnvironments.useQuery(
      {
        id: questionId,
      },
      {
        onError: (e) => {
          toast.error("Failed to fetch environments: " + e.message);
        },
        onSuccess: (data) => {
          setEnvironmentId(data[0]?.id ?? null);
        },
        enabled: !!questionId,
        refetchOnWindowFocus: false,
      },
    );

   

  const runTestCase = api.judge.runTestCase.useMutation({
    onSuccess: (data) => {
      setOutput(data);
    },
    onError: (e) => {
      toast.error("Failed to run code: " + e.message);
      setOutput(undefined);
    },
  });

  const testCases = api.question.getOneEnvironmentTestCases.useQuery(
    {
      id: environmentId!,
    },
    {
      onError: (e) => {
        toast.error("Failed to fetch test cases: " + e.message);
      },
      enabled: !!environmentId,
      refetchOnWindowFocus: false,
    },
  );
  
  
  const environments = environmentsQuery?.data;

  const languages = api.judge.getSpecificLanguages.useQuery({
    languages: environments?.map(({ languageId }) => languageId) ?? [],
  });

  const currentEnvironment = environments?.find(
    (val) => val.id === environmentId,
  );

  const currentLanguage = languages.data?.find(
    (val) => val.id === currentEnvironment?.languageId
  );

  const currentTest = testCases.data?.find((val) => {
    val.id === testCaseId
  })

  // update test case id when environment changes
  useEffect(() => {
    setTestCaseId(testCases?.data?.find((testcase) => testcase.environmentId === currentEnvironment?.id)?.id ?? "");
  }, [currentEnvironment, testCases])


  useEffect(() => {
    setTestCaseIdList(
      testCases?.data?.map(({ id, description }) => ({ id, description })) ??
        [],
    );
  }, [testCases?.data]);

  return {
    output,
    questionTitleList: questions,
    currentQuestion: question.data,
    runSelecteTestCase(code) {
      if (questionId && environmentId && testCaseId) {
        runTestCase.mutate({ testCaseId, source_code: code });
      } else {
        toast.error("Test case not selected");
      }
    },
    loading,
    setQuestionId,
    testCaseIdList,
    setTestCaseId,
    currentTestCase: currentTest,
    languages: languages.data ?? [],
    currentLanguage,
    setCurrentLanguage: (language: Language) => {
      const env = environments?.find(
        (env) => env.languageId === language.id,
      );
      env && setEnvironmentId(env.id);
    },
    template: currentEnvironment?.template ?? "",
    environmentId: currentEnvironment?.id ?? "",
  };
}
