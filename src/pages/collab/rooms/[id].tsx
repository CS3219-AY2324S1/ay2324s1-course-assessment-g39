/**
 * A collab room
 */

import { useRouter } from "next/router";
import { WithAuthWrapper } from "~/components/wrapper/AuthWrapper";
import useCodeSession from "~/hooks/useCodeSession";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import { LoadingPage } from "~/components/Loading";
import useQuestions from "~/hooks/useQuestions";
import { Language, Question } from "~/types/global";
import { loadLanguage, langNames, langs } from '@uiw/codemirror-extensions-langs';
import toast from "react-hot-toast";
import QuestionView from "~/components/QuestionView";



function getLanguage(language: string) {
    const l = language.toLowerCase();
    if (!l.includes("c++") || l.includes('gcc') || l.includes('clang')) {
        return 'c';
    }
    if (l.includes("c++")) {
        return 'cpp';
    }
    return "c";
}


const SharedEditor = ({
  onSave,
  judgeLanguages,
  currentLanguage,
}: {
  onSave: (saving: boolean) => void;
  judgeLanguages: Language[];
  currentLanguage: Language | undefined;
}) => {
  const router = useRouter();
  const roomId = router.query.id;
  const [code, setCode, loadedCode] = useCodeSession(roomId as string);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState("cpp");
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
  
  const lang = loadLanguage(getLanguage('C++'));
  return (
    <div className="h-full w-full">
      Language
      <select
        name="language"
        id="language"
        className="mt-3 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        required
      >
        {judgeLanguages.map((language, i) => (
          <option key={language.id} value={language.id} selected={i === 0}>
            {`[${language.id}] ` + language.name}
          </option>
        ))}
      </select>
      {lang !== null && <CodeMirror
        theme="dark"
        onChange={(_, viewUpdate) =>
          setCode({
            changes: viewUpdate.changes,
          })
        }
        minHeight="500"
        value={code.toString()}
        extensions={[
            lang
        ]}
      />}
      {lang === null && <div>Invalid code language selected</div>}
    </div>
  );
};

// todo: toolbar for options
const Toolbar = ({ judgeLanguages, currentLanguage }) => {

};

/**
 * A shared room for a user to use
 * @returns
 */
const Room = () => {
  const useQuestionObject = useQuestions();
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-row h-full">
      <QuestionView question={useQuestionObject.currentQuestion} />
      <div className="room-editor-wrapper">
      <SharedEditor
        onSave={setSaving}
        judgeLanguages={useQuestionObject.languages}
        currentLanguage={useQuestionObject.currentLanguage}
      />
      </div>
    </div>
  );
};

export default WithAuthWrapper(Room);
