import { useEffect, useState } from "react";
import { LoadingPage } from "~/components/Loading";
import { Question } from "~/types/global";
import { parseMD } from "~/utils/utils";

const QuestionView = ({
  question,
}: {
  question: Question | null | undefined;
}) => {
  const [html, setHTML] = useState("");
  useEffect(() => {
    void (async () => setHTML(await parseMD(question?.body ?? "")))();
  }, [question]);

  if (!question) return <LoadingPage />;
  return (
    <div
      className="h-full w-full p-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default QuestionView;
