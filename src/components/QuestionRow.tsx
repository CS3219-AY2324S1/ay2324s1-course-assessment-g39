import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type HTMLAttributes } from "react";
import { useSmartClip } from "~/utils/smartClip";
import { type Question } from "../types/global";
import { parseMD } from "../utils/utils";
import { StyledCheckbox } from "./StyledCheckbox";
import { StyledInput, StyledTextarea } from "./StyledInput";

const MIN_TEXTAREA_HEIGHT_px = 41;

export const QuestionRow = ({
  question, initialQuestion, onQuestionChange, onQuestionDelete, checked, indeterminate, ...others
}: {
  question: Question;
  initialQuestion: Question;
  onQuestionChange: (q: Question) => void;
  onQuestionDelete?: () => void;
  checked?: boolean;
  indeterminate?: boolean;
} & HTMLAttributes<HTMLDivElement>) => {

  const { title, body, difficulty, category } = question;

  const [isFocused, setIsFocused] = useState(false);
  const [e, setE] = useState<ClipboardEvent<HTMLTextAreaElement> | null>(null);
  const [html, setHTML] = useState('');

  // useSmartClip({
  //   e, onFound: (text) => {
  //     if (text) {
  //       e?.preventDefault();
  //       textAreaRef.current?.setRangeText(text);
  //     }
  //   }
  // })

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const onBlur = () => {
    void (async () => setHTML((await parseMD(body)).replace(/href/g, "target='_blank' rel='noopener noreferrer' href")))();
    setIsFocused(false);
  };

  const handleOnPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    // setE(e);
    // console.log(e);
    void navigator.clipboard.read().then((data) => {
      console.log(data);
    })
  }

  useEffect(() => {
    void (async () => setHTML(await parseMD(body)))();
  }, [body]);

  useLayoutEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = `${MIN_TEXTAREA_HEIGHT_px}px`;
      textAreaRef.current.style.height = `${Math.max(textAreaRef.current.scrollHeight, MIN_TEXTAREA_HEIGHT_px)}px`;
    }
  }, [isFocused, body]);

  return <div onBlur={onBlur} {...others}>

    {onQuestionDelete ?
      <StyledCheckbox onChange={onQuestionDelete} checked={checked} indeterminate={indeterminate} /> :
      <div className="aspect-square p-2 tb-border" />
    }

    <StyledInput name="title" value={title} onChange={(e) => {
      onQuestionChange({ ...question, title: e.target.value }
      );
    }} span={2} highlight={title !== initialQuestion.title} />

    <StyledTextarea
      style={{
        minHeight: `${MIN_TEXTAREA_HEIGHT_px}px`,
        display: isFocused ? 'block' : 'none',
      }}
      onChange={(e) => onQuestionChange({ ...question, body: e.target.value })}
      onPaste={handleOnPaste}
      value={body} span={4} highlight={body !== initialQuestion.body} ref={textAreaRef} />

    <div
      className="flex-[4_4_0%] tb-border p-2 font-sans [&>ul]:list-disc [&>ul]:list-inside [&>ol]:list-decimal [&>ol]:list-inside"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={() => setIsFocused(true)}
      style={{
        minHeight: `${MIN_TEXTAREA_HEIGHT_px}px`,
        display: isFocused ? 'none' : 'block',
      }}
    />

    <StyledInput name="difficulty" value={difficulty} onChange={(e) => onQuestionChange({ ...question, difficulty: parseInt(e.target.value) }
    )} type="number" min="0" max="5" highlight={difficulty !== initialQuestion.difficulty} />

    <StyledInput name="category" value={category} onChange={(e) => onQuestionChange({ ...question, category: e.target.value })} span={2} highlight={category !== initialQuestion.category} />
  </div>;
};
