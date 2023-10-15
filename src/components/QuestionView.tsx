import { LanguageName, loadLanguage } from "@uiw/codemirror-extensions-langs";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";
import { LoadingPage } from "~/components/Loading";
import { Question } from "~/types/global";
import { parseMD } from "~/utils/utils";

const QuestionView = ({
  question,
  className,
  template,
  language,
}: {
  question: Question | null | undefined;
  className: string | undefined;
  template: string | undefined;
  language: LanguageName;
}) => {
  const [html, setHTML] = useState("");
  useEffect(() => {
    void (async () => setHTML(await parseMD(question?.body ?? "")))();
  }, [question]);

  if (!question) return <LoadingPage />;
  const lang = loadLanguage(language);
  return (
    <div className={`h-full overflow-auto ${className}`}>
      <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
      <label className="mt-5">
        Template code
      <div className="border-2 border-black">
      {lang && <CodeMirror
        theme="dark" 
        value={template}
        extensions={[lang]}
        maxHeight="500px"
      />}
      </div>
      </label>
    </div>
  );
};

export default QuestionView;
