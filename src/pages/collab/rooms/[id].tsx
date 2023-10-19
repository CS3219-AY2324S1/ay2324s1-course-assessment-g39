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
import {
  CodeOutput,
  Language,
  ModifyQuestionProps,
  ModifyTestCaseProps,
  Question,
  TestCase,
} from "~/types/global";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { loadLanguage, LanguageName } from "@uiw/codemirror-extensions-langs";
import QuestionView from "~/components/QuestionView";
import { StyledButton } from "~/components/StyledButton";
import { getLanguage } from "~/utils/utils";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import { useSession } from "next-auth/react";
import { Message } from "~/server/api/routers/communication";

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

  if (!loadedCode || saving) {
    return <LoadingPage />;
  }
  const internalLanguage = getLanguage(currentLanguage?.name ?? "");
  const lang = internalLanguage
    ? loadLanguage(internalLanguage)
    : markdown({ base: markdownLanguage, codeLanguages: languages });
  return (
    <div className="h-full w-full grid-span-1">
      Editor language: {internalLanguage}
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
      <label className="flex flex-row col-span-2">
        Language&nbsp;
        <select
          name="language"
          id="language"
          value={currentLanguage?.id}
          onChange={(e) => {
            const lang = judgeLanguages.find(
              (l) => l.id === parseInt(e.target.value),
            );
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
        <StyledButton onClick={runTest}>Run selected test</StyledButton>
        <StyledButton onClick={submit}>Submit</StyledButton>
      </div>
    </div>
  );
};

const Output = ({
  output,
  className,
}: {
  output: CodeOutput | undefined;
  className: string | undefined;
}) => (
  <div className={className}>
    <label className="w-full mb-10 flex-1 block text-sm font-medium text-gray-300 dark:text-white">
      <em>Stdout</em>
      <textarea
        name="output"
        id="output"
        className="mt-3 h-full min-h-[3rem] w-full p-2 font-mono box-border bg-gray-500 border border-gray-300 text-gray-900 sm:text-sm rounded-lg  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white "
        value={output?.stdout ?? ""}
        readOnly
      />
      <em>Stderr</em>
      <textarea
        name="output"
        id="output"
        className="mt-3 h-full min-h-[5rem] w-full p-2 font-mono box-border bg-gray-500 border border-gray-300 text-gray-900 sm:text-sm rounded-lg  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white "
        value={output?.stderr ?? ""}
        readOnly
      />
      <em>Status</em>
      <textarea
        name="output"
        id="output"
        className="mt-3 h-full min-h-[2rem] w-full p-2 font-mono box-border bg-gray-500 border border-gray-300 text-gray-900 sm:text-sm rounded-lg  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white "
        value={output?.status.description ?? ""}
        readOnly
      />
    </label>
  </div>
);

const Chatbox = ({
  sessionId,
  userId,
  userName,
  className,
}: {
  sessionId: string;
  userId: string;
  userName: string;
  className?: string | undefined;
}) => {
  const [chatState, setChatState] = useState({
    messages: [] as Message[],
    currentMessage: "",
    partnerName: "",
    partnerIsTyping: false,
  });

  const utils = api.useContext();

  const allSessionMessages = api.messages.getAllSessionMessages.useQuery({
    sessionId,
  });

  const addMessageMutation = api.messages.addMessage.useMutation();

  api.messages.subscribeToSessionMessages.useSubscription(
    { sessionId },
    {
      onData: (_data) => {
        void allSessionMessages.refetch();
        // TODO: Fix autoscroll to bottom
        const messagesContainer = document.getElementById("messages-container");
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      },
      onError(err) {
        console.log("Subscription error: ", err);
        void Promise.resolve(utils.messages.invalidate());
      },
    },
  );

  const addWhoIsTypingMutation = api.messages.addWhoIsTyping.useMutation();

  api.messages.subscribeToWhoIsTyping.useSubscription(
    { sessionId, userId },
    {
      onData: (data: { otherUser: string; isTyping: boolean }) => {
        setChatState((state) => ({
          ...state,
          partnerName: data.otherUser,
          partnerIsTyping: data.isTyping,
        }));
      },
      onError(err) {
        console.log("Subscription error: ", err);
        void Promise.resolve(utils.messages.invalidate());
      },
    },
  );

  const sendMessage = () => {
    // Don't send empty messages, or messages with only whitespace. Could change this later
    if (chatState.currentMessage.trim().length === 0) return;

    addMessageMutation.mutate({
      sessionId,
      senderId: userId,
      senderName: userName,
      message: chatState.currentMessage,
    });
    setChatState((state) => ({
      ...state,
      currentMessage: "",
      partnerIsTyping: false,
    }));
  };

  const onTyping = (value: string) => {
    addWhoIsTypingMutation.mutate({
      sessionId,
      userId,
      userName,
      isTyping: value.length > 0,
    });
    setChatState((prev) => {
      return {
        ...prev,
        currentMessage: value,
      };
    });
  };

  const userTypingMessage = chatState.partnerIsTyping
    ? chatState.partnerName + " is typing..."
    : "";

  return (
    <div className={className}>
      <div className="messages-container overflow-y-scroll flex flex-col h-[19rem]">
        {allSessionMessages.data?.map((message, index) => {
          return (
            <div
              key={index}
              className="rounded-md dark:bg-gray-700 text-white p-2 my-2"
            >
              <div className="flex justify-between">
                <span>{message.senderName}</span>
                <span>Sent at {message.createdAt.toLocaleTimeString()}</span>
              </div>
              <p>{message.message}</p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col mt-2">
        {chatState.partnerIsTyping && (
          <p className="text-white mb-2">{userTypingMessage}</p>
        )}
        <div className="flex">
          <input
            className="w-full rounded-md p-2 focus:ring-primary-600 focus:border-primary-600"
            type="text"
            value={chatState.currentMessage}
            onChange={(e) => onTyping(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
        </div>
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
  const { data: session, status } = useSession();

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
        <div className="room-question-wrapper grid grid-rols-8">
          <QuestionView
            question={useQuestionObject.currentQuestion}
            template={useQuestionObject.template}
            language={
              getLanguage(useQuestionObject.currentLanguage?.name ?? "") ?? "c"
            }
            className="row-span-6 p-3"
          />
          <Tabs>
            <TabList>
              <Tab>Output</Tab>
              <Tab>Chat</Tab>
              <Tab>Video Call</Tab>
            </TabList>
            <TabPanel>
              <Output
                output={useQuestionObject.output}
                className="row-span-2 w-full h-full p-3"
              />
            </TabPanel>
            <TabPanel>
              <Chatbox
                sessionId={roomId as string}
                userId={session?.user.id ?? ""}
                userName={session?.user.name ?? ""}
                className="row-span-2 w-full h-full p-3 flex flex-col text-black"
              />
            </TabPanel>
            <TabPanel>
              <p>Lorem Ipsum</p>
            </TabPanel>
          </Tabs>
        </div>
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