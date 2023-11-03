import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import Image from "next/image";
import { toast } from "react-hot-toast";
import J0Logo from "~/assets/j0_white.png";
import { PeerPrepRectLogo } from "~/assets/logo";
import { api } from "~/utils/api";
import { PageLayout } from "~/components/Layout";
import Head from "next/head";
import { WithAuthWrapper } from "~/components/wrapper/AuthWrapper";
// import { useSession } from "next-auth/react";

function Questions() {
  const [output, setOutput] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const languages =
    api.judge.getLanguages.useQuery(undefined, {
      onError: (e) => {
        toast.error("Failed to fetch languages: " + e.message);
      },
    }).data ?? [];

  const questions =
    api.question.getAll.useQuery(undefined, {
      onError: (e) => {
        toast.error("Failed to fetch questions: " + e.message);
      },
      onSuccess: (data) => {
        setQuestionId(data[0]?.id ?? null);
      },
      refetchOnWindowFocus: false,
    }).data ?? [];

  const environments =
    api.question.getOneEnvironments.useQuery(
      {
        id: questionId!,
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

  const testCases =
    api.question.getOneEnvironmentTestCases.useQuery(
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
    ).data ?? [];

  const run = api.judge.run.useMutation({
    onSuccess: (data) => {
      setOutput(JSON.stringify(data, null, 4));
    },
    onError: (e) => {
      toast.error("Failed to run code: " + e.message);
      setOutput(null);
    },
  });

  const runTestCase = api.judge.runTestCase.useMutation({
    onSuccess: (data) => {
      setOutput(JSON.stringify(data, null, 4));
    },
    onError: (e) => {
      toast.error("Failed to run code: " + e.message);
      setOutput(null);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const source_code = data.get("source_code") as string;
    if (questionId && environmentId) {
      const testCaseId = data.get("testCases") as string;
      runTestCase.mutate({ testCaseId, source_code });
    } else {
      const language_id = Number(data.get("language") as string);
      run.mutate({ language_id, source_code });
    }
  };

  const keyRedirect = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value =
        textarea.value.substring(0, start) +
        "    " +
        textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 4;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value =
        environments.find((environment) => environment.id == environmentId)
          ?.template ?? "";
    }
  }, [environmentId, environments]);

  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <main className=" flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[var(--bg-1)] to-[var(--bg-2)]">
        <div className="container flex flex-col items-center justify-center p-12 max-w-screen-xl">
          <div className="flex flex-row items-center border-y-2 border-slate-500 border-opacity-50">
            <PeerPrepRectLogo height={250} width={250} fill="none" />
            <span className="text-5xl mx-4 text-[var(--txt-3)]">&times;</span>
            <Image src={J0Logo} alt="J0 Logo" width={250} className="p-3" />
          </div>
          <div className="py-3" />
          <form
            className="w-full h-full flex flex-col gap-3 items-start"
            action="#"
            onSubmit={handleSubmit}
          >
            <label
              className="block text-sm font-medium text-gray-900 dark:text-white"
              style={{
                opacity: questionId && environmentId ? 0.5 : 1,
              }}
            >
              Language
              <select
                name="language"
                id="language"
                className="mt-3 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                required
              >
                {languages.map((language, i) => (
                  <option
                    key={language.id}
                    value={language.id}
                    selected={i === 0}
                  >
                    {`[${language.id}] ` + language.name}
                  </option>
                ))}
              </select>
            </label>

            <span className="flex flex-row gap-6">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                Question
                <select
                  name="question"
                  id="question"
                  className="mt-3 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  required
                  onChange={(e) => setQuestionId(e.target.value)}
                >
                  {questions.map((question, i) => (
                    <option
                      key={question.id}
                      value={question.id}
                      selected={i == 0}
                    >
                      {question.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                Environments
                <select
                  name="environments"
                  id="environments"
                  className="mt-3 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  onChange={(e) => setEnvironmentId(e.target.value)}
                >
                  {environments.map((environment, i) => (
                    <option
                      key={environment.id}
                      value={environment.id}
                      selected={i == 0}
                    >
                      {
                        languages.find(
                          (language) => language.id == environment.languageId,
                        )?.name
                      }
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-900 dark:text-white">
                Test Cases
                <select
                  name="testCases"
                  id="testCases"
                  className="mt-3 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                >
                  {testCases.map((testCase, i) => (
                    <option
                      key={testCase.id}
                      value={testCase.id}
                      selected={i == 0}
                    >
                      {testCase.description}
                    </option>
                  ))}
                </select>
              </label>
            </span>

            <label className="w-full mb-10 flex-1 block text-sm font-medium text-gray-900 dark:text-white">
              Code
              <textarea
                name="source_code"
                id="source_code"
                ref={textareaRef}
                onKeyDown={(e) => keyRedirect(e)}
                className="mt-3 h-full min-h-[10rem] w-full p-2 font-mono box-border bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white "
              />
            </label>

            <button
              type="submit"
              className=" text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
            >
              Run
            </button>

            {output && (
              <label className="w-full mb-10 flex-1 block text-sm font-medium text-gray-900 dark:text-white">
                Output
                <textarea
                  name="output"
                  id="output"
                  className="mt-3 h-full min-h-[10rem] w-full p-2 font-mono box-border bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white "
                  value={output}
                  readOnly
                />
              </label>
            )}
          </form>
        </div>
      </main>
    </>
  );
}

export default WithAuthWrapper(Questions, true);