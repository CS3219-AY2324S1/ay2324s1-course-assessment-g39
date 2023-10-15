/**
 * Page used to add test cases
 */

import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import QuestionView from "~/components/QuestionView";
import { StyledButton } from "~/components/StyledButton";
import { StyledTextarea } from "~/components/StyledInput";
import { WithAuthWrapper } from "~/components/wrapper/AuthWrapper";
import useQuestions from "~/hooks/useQuestions";
import {
  Language,
  ModifyQuestionProps,
  ModifyTestCaseProps,
} from "~/types/global";
import { api } from "~/utils/api";
import { getLanguage } from "~/utils/utils";

// todo: toolbar for options
const Toolbar = ({
  judgeLanguages,
  currentLanguage,
  setCurrentLanguage,
  modifyQuestionProps,
  modifyTestCaseProps,
  submit,
  deleteTestCase,
}: {
  judgeLanguages: Language[];
  currentLanguage: Language | undefined;
  setCurrentLanguage: (language: Language) => void;
  modifyQuestionProps: ModifyQuestionProps;
  modifyTestCaseProps: ModifyTestCaseProps;
  submit: () => void;
  deleteTestCase: () => void;
}) => {
  return (
    <div className="bg-slate-900 text-white items-center p-3 grid grid-cols-8 gap-x-5">
      <label className="flex flex-row col-span-2">
        Language&nbsp;
        <select
          name="language"
          id="language"
          value={currentLanguage?.id}
          onChange={(e) => {
            const lang = judgeLanguages.find((l) => l.id === parseInt(e.target.value ));
            lang && setCurrentLanguage(lang);
          }}
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          required
        >
          {judgeLanguages.map((language, i) => (
            <option key={language.id} value={language.id}>
              {language.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-row col-span-2">
        Question&nbsp;
        <select
          name="question"
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          value={modifyQuestionProps.currentQuestion?.id}
          onChange={(e) => {
            modifyQuestionProps.setQuestionId(e.target.value);
          }}
        >
          {modifyQuestionProps.questionTitleList.map((question) => {
            return (
              <option key={question.id} value={question.id}>
                {question.title}
              </option>
            );
          })}
        </select>
      </label>
      <div className="flex flex-row col-span-2">
        <label>
          Test Case&nbsp;
          <select
            name="Test Case"
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            value={modifyTestCaseProps.currentTestCase?.id}
            onChange={(e) => {
              modifyTestCaseProps.setTestCaseId(e.target.value);
            }}
          >
            {modifyTestCaseProps.testCaseIdList.map((testcase) => {
              return (
                <option key={testcase.id} value={testcase.id}>
                  {testcase.description}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <div className="flex flex-row col-span-2 gap-2">
        <StyledButton onClick={submit}>Create new testcase</StyledButton>
        <StyledButton onClick={deleteTestCase}>
          Delete selected test case
        </StyledButton>
      </div>
    </div>
  );
};

type FormState = {
  description: string;
  hint: string;
  test: string;
  input: string;
  output: string;
  timeLimit: number; // in seconds
  memoryLimit: number; // in kb
  withInput: boolean;
  withOutput: boolean;
};

// maintainer route to add and delete test cases
const CreateTestCase = () => {
  const useQuestionObject = useQuestions();
  const { data: session } = useSession();
  
  const router = useRouter();
  const isMaintainer = session?.user.role === "MAINTAINER";
  useEffect(() => {
    if (session && !isMaintainer) {
      void router.push("/");
    }
  }, [router]);
  const [formData, setFormData] = useState<FormState>({
    description: "",
    hint: "",
    test: "",
    input: "",
    output: "",
    timeLimit: 1,
    memoryLimit: 4096,
    withInput: false,
    withOutput: false,
  });
  const deleteTestCaseMutation = api.question.deleteTestCase.useMutation({
    onSuccess(data) {
      // refresh test case data
      router.reload();
    },
    onError(data) {
      toast.error("Failed to delete");
    },
  });
  const setFormDataWrapper = (item: Partial<FormState>) => {
    setFormData((prev) => ({
      ...prev,
      ...item,
    }));
  };
  const createTestCaseMutation = api.question.createTestCase.useMutation({
    onSuccess(data) {
      router.reload()
    },
    onError(data) {
      toast.error(data.message)
    }
  });

  /**
   * Run the mutation
   */
  function submit() {
    createTestCaseMutation.mutate({
      ...formData,
      input: formData.withInput ? formData.input : undefined,
      output: formData.withOutput ? formData.output : undefined,
      environmentId: useQuestionObject.environmentId,
    });
  }

  /**
   *
   */
  function deleteTestCase() {
    if (!useQuestionObject.currentTestCase) return;
    deleteTestCaseMutation.mutate({
      id: useQuestionObject.currentTestCase.id,
    });
  }
  return (
    <div className="flex flex-col bg-slate-600 h-screen text-white">
      <Toolbar
        judgeLanguages={useQuestionObject.languages}
        currentLanguage={useQuestionObject.currentLanguage}
        setCurrentLanguage={useQuestionObject.setCurrentLanguage}
        modifyQuestionProps={{
          questionTitleList: useQuestionObject.questionTitleList,
          setQuestionId: useQuestionObject.setQuestionId,
          currentQuestion: useQuestionObject.currentQuestion,
        }}
        modifyTestCaseProps={{
          testCaseIdList: useQuestionObject.testCaseIdList,
          setTestCaseId: useQuestionObject.setTestCaseId,
          currentTestCase: useQuestionObject.currentTestCase,
        }}
        submit={submit}
        deleteTestCase={deleteTestCase}
      />
      <div className="grid grid-cols-2 h-screen overflow-auto">
        <QuestionView
          question={useQuestionObject.currentQuestion}
          template={useQuestionObject.template}
          language={
            getLanguage(useQuestionObject.currentLanguage?.name ?? "") ?? "c"
          }
          className="w-full m-3 col-span-1 flex flex-col"
        />
        <div className="overflow-auto col-span-1 flex flex-col bg-slate-800 text-white p-8 w-full h-full">
          <label>
            test
            <ReactCodeMirror
              theme="dark"
              value={formData.test}
              onChange={(value) => {
                setFormDataWrapper({ test: value });
              }}
              extensions={[
                loadLanguage(
                  getLanguage(useQuestionObject.currentLanguage?.name ?? "") ??
                    "c",
                )!,
              ]}
            />
          </label>
          <label>
            hint
            <input
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              type="text"
              value={formData.hint}
              onChange={(event) =>
                setFormDataWrapper({ hint: event.target.value })
              }
            />
          </label>
          <label>
            Description
            <input
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              type="text"
              value={formData.description}
              onChange={(event) =>
                setFormDataWrapper({ description: event.target.value })
              }
            />
          </label>
          <label>
            Input (IO)
            <StyledTextarea
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              value={formData.input}
              onChange={(event) => {
                setFormDataWrapper({ input: event.target.value });
              }}
              disabled={!formData.withInput}
            />
          </label>
          <label>
            Output
            <StyledTextarea
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              value={formData.output}
              onChange={(event) => {
                setFormDataWrapper({ output: event.target.value });
              }}
              disabled={!formData.withOutput}
            />
          </label>

          <label>
            Time limit
            <input
              type="number"
              value={formData.timeLimit}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              onChange={(event) => {
                setFormDataWrapper({
                  timeLimit: parseFloat(event.target.value),
                });
              }}
            />
          </label>
          <label>
            Memory Limit (In Kb)
            <input
              type="number"
              value={formData.memoryLimit}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              onChange={(event) => {
                setFormDataWrapper({
                  memoryLimit: parseInt(event.target.value),
                });
              }}
            />
          </label>
          <div className="flex flex-row gap-4 p-3">
            <label>
              With Input
              <input
                className="m-3"
                type="checkbox"
                checked={formData.withInput}
                onChange={(e) =>
                  setFormDataWrapper({ withInput: e.target.checked })
                }
              />
            </label>
            <label>
              With Output
              <input
                type="checkbox"
                className="m-3"
                checked={formData.withOutput}
                onChange={(e) =>
                  setFormDataWrapper({ withOutput: e.target.checked })
                }
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithAuthWrapper(CreateTestCase);
