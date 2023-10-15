import { useEffect, useState } from "react";
import { LoadingPage } from "~/components/Loading";
import { Question } from "~/types/global";
import { parseMD } from "~/utils/utils";

const QuestionView = ({
  question,
  className,
}: {
  question: Question | null | undefined;
  className: string | undefined;
}) => {
  const [html, setHTML] = useState("");
  useEffect(() => {
    void (async () => setHTML(await parseMD(question?.body ?? "")))();
  }, [question]);

  if (!question) return <LoadingPage />;
  return (
    <div className={`h-full overflow-auto ${className}`}>
      <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

export default QuestionView;
