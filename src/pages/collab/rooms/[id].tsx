/**
 * A collab room
 */

import { useRouter } from "next/router";
import { WithAuthWrapper } from "~/components/wrapper/AuthWrapper";
import useCodeSession, { CodeSessionResult } from "~/hooks/useCodeSession";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import { LoadingPage } from "~/components/Loading";
import useQuestions from "~/hooks/useQuestions";
import { Language, Question, TestCase } from "~/types/global";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import {
  loadLanguage,
  langNames,
  langs,
} from "@uiw/codemirror-extensions-langs";
import QuestionView from "~/components/QuestionView";
import { StyledButton } from "~/components/StyledButton";

function getLanguage(language: string) {
  const l = language.toLowerCase();

  if (!l.includes("c++") && (l.includes("gcc") || l.includes("clang"))) {
    return "c";
  }
  if (l.includes("c++")) {
    return "cpp";
  }
  if (l.includes("java")) {
    return "java";
  }

  if (l.includes("python")) {
    return "python";
  }
  // default to markdown
  return undefined;
}

const SharedEditor = ({
  onSave,
  codeSession,
  currentLanguage,
}: {
  onSave: (saving: boolean) => void;
  currentLanguage: Language | undefined;
  codeSession: CodeSessionResult;
}) => {
  const router = useRouter();
  const [code, setCode, loadedCode] = codeSession;
  const [saving, setSaving] = useState(false);
  const saveCodeSession = api.codeSession.saveSession.useQuery(
    { codeSessionId: router.query.id as string },
    { enabled: saving },
  );
  useEffect(() => {
    onSave(saving);
  }, [saving]);
  useEffect(() => {
    setSaving(false);
  }, [saveCodeSession]);
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "s" && !saving) {
      // Prevent the Save dialog to open
      e.preventDefault();
      setSaving(true);
    }
  });

  if (!loadedCode) {
    return <LoadingPage />;
  }
  const internalLanguage = getLanguage(currentLanguage?.name ?? "");
  const lang = internalLanguage
    ? loadLanguage(internalLanguage)
    : markdown({ base: markdownLanguage, codeLanguages: languages });
  return (
    <div className="h-full w-full">
      {internalLanguage}
      {lang !== null && (
        <CodeMirror
          theme="dark"
          onChange={(_, viewUpdate) =>
            setCode({
              changes: viewUpdate.changes,
            })
          }
          minHeight="500"
          value={code.toString()}
          extensions={[lang]}
        />
      )}
      {lang === null && <div>Invalid code language selected</div>}
    </div>
  );
};

// todo: dup code
type ModifyQuestionProps = {
  questionTitleList: { id: string; title: string }[];
  setQuestionId: (id: string) => void;
  currentQuestion: Question | null | undefined;
};

type ModifyTestCaseProps = {
  testCaseIdList: { id: string; description: string }[];
  currentTestCase: TestCase | undefined;
  setTestCaseId: (testCaseId: string) => void;
};

// todo: toolbar for options
const Toolbar = ({
  judgeLanguages,
  currentLanguage,
  setCurrentLanguage,
  modifyQuestionProps,
  modifyTestCaseProps,
  runTests: runTest,
  submit,
}: {
  judgeLanguages: Language[];
  currentLanguage: Language | undefined;
  setCurrentLanguage: (language: Language) => void;
  modifyQuestionProps: ModifyQuestionProps;
  modifyTestCaseProps: ModifyTestCaseProps;
  runTests: () => void;
  submit: () => void;
}) => {
  return (
    <div className="bg-slate-900 text-white items-center p-3 grid grid-cols-8 gap-x-5">
      <div className="flex flex-row col-span-2">
        Language&nbsp;
        <select
          name="language"
          id="language"
          value={currentLanguage?.name}
          onChange={(e) => {
            const lang = judgeLanguages.at(parseInt(e.target.value));
            lang && setCurrentLanguage(lang);
          }}
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          required
        >
          {judgeLanguages.map((language, i) => (
            <option key={language.id} value={i}>
              {language.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-row col-span-2">
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
      </div>
      <div className="flex flex-row col-span-2">
        Question&nbsp;
        <select
          name="Test Case"
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          value={modifyTestCaseProps.currentTestCase?.id}
          onChange={(e) => {
            modifyQuestionProps.setQuestionId(e.target.value);
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
      </div>
      <div className="flex flex-row col-span-2 gap-2">
        <StyledButton onClick={runTest}>Run selected test</StyledButton>
        <StyledButton onClick={submit}>Submit</StyledButton>
      </div>
    </div>
  );
};

/**
 * A shared room for a user to use
 * @returns
 */
const Room = () => {
  const useQuestionObject = useQuestions();
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const roomId = router.query.id;
  const codeSession = useCodeSession(roomId as string);

  function submit() {
    // todo: submit code and store the results using the answer router
  }

  function runTest() {
    // run test
    useQuestionObject.runSelecteTestCase(codeSession[0].toString());
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-600 text-white">
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
        runTests={runTest}
        submit={submit}
      />

      <div className="flex flex-row h-full">
        <QuestionView question={useQuestionObject.currentQuestion} />
        <div className="room-editor-wrapper bg-slate-600">
          <SharedEditor
            onSave={setSaving}
            codeSession={codeSession}
            currentLanguage={useQuestionObject.currentLanguage}
          />
        </div>
      </div>
    </div>
  );
};

export default WithAuthWrapper(Room);
