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
  const [currentTest, setCurrentTestCase] = useState<TestCase | undefined>();
  const [testCaseIdList, setTestCaseIdList] = useState<
    {
      description: string;
      id: string;
    }[]
  >([]);
  const [currentLanguage, setCurrentLanguage] = useState<
    Language | undefined
  >();

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

  const environments =
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
    ).data ?? [];

  const languages = api.judge.getSpecificLanguages.useQuery({
    languages: environments.map(({ languageId }) => languageId),
  });

  const currentEnvironment = environments.find(
    (val) => val.id === environmentId,
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

  useEffect(() => {
    if (!currentLanguage) return;
    const env = environments.find(
      (env) => env.languageId === currentLanguage.id,
    );
    env && setEnvironmentId(env.id);
  }, [currentLanguage, environments]);

  useEffect(() => {
    setCurrentTestCase(
      testCases?.data?.find((testcase) => testcase.id === testCaseId),
    );
  }, [testCaseId, testCases?.data]);

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
      if (questionId && environmentId) {
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
      setCurrentLanguage(language);
    },
    template: currentEnvironment?.template ?? "",
    environmentId: environmentId ?? "",
  };
}
