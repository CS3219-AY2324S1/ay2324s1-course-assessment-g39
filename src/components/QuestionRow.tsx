import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type HTMLAttributes } from "react";
import { useSmartClip } from "~/utils/smartClip";
import { type Question } from "../types/global";
import { parseMD, pasteText } from "../utils/utils";
import { StyledCheckbox } from "./StyledCheckbox";
import { StyledInput, StyledTextarea } from "./StyledInput";
import { z } from "zod";
import { api } from "~/utils/api";
import { text } from "stream/consumers";

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
  const [html, setHTML] = useState('');

  const textAreaRefs = useRef<(HTMLTextAreaElement | null)[]>([null, null, null]);
  const rendererRef = useRef<HTMLDivElement | null>(null);

  const getPresignedUrl = api.form.createPresignedUrl.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: false
  });

  const onBlur = () => {
    void (async () => setHTML((await parseMD(body))))();
    setIsFocused(false);
  };

  const processPaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    for (const types of e.clipboardData.types) {
      if (types === 'text/plain') {
        const text = e.clipboardData.getData(types);
        if (z.string().url().safeParse(text).success) {
          pasteText(textAreaRefs.current[1], `[link](${text})`);
        } else {
          pasteText(textAreaRefs.current[1], text);
        }
        return;
      } else if (types === 'Files') {
        const file = e.clipboardData.files[0];
        if (file?.type.startsWith('image/')) {
          const res = (await getPresignedUrl.refetch()).data;
          if (res) {
            const { url, fields } = res;
            const formData = new FormData();
            Object.entries({
              ...fields,
              "Content-Type": file.type,
              file,
            }).forEach(([key, value]) => {
              formData.append(key, value);
            });
            void fetch(url, {
              method: "POST",
              body: formData,
            });
            pasteText(textAreaRefs.current[1], `![image](${url}/${fields.key})`);
          }
          return;
        }
      }
    }
  }

  useLayoutEffect(() => {
    textAreaRefs.current.forEach(r => {
      if (r) {
        r.style.height = `${MIN_TEXTAREA_HEIGHT_px}px`;
      }
    });
    rendererRef.current!.style.height = `${MIN_TEXTAREA_HEIGHT_px}px`;

    const height = Math.max(
      ...textAreaRefs.current.map(r => r?.scrollHeight ?? 0),
      rendererRef.current!.scrollHeight,
      MIN_TEXTAREA_HEIGHT_px
    );
    textAreaRefs.current.forEach(r => {
      if (r) {
        r.style.height = `${height}px`;
      }
    });
    rendererRef.current!.style.height = `${height}px`;
  }, [body, html, isFocused]);

  return <div onBlur={onBlur} {...others}>

    {onQuestionDelete ?
      <StyledCheckbox onChange={onQuestionDelete} checked={checked} indeterminate={indeterminate} /> :
      <div className="aspect-square p-2 tb-border" />
    }

    <StyledTextarea name="title" style={{
      minHeight: `${MIN_TEXTAREA_HEIGHT_px}px`,
    }} value={title} onChange={(e) => {
      onQuestionChange({ ...question, title: e.target.value }
      );
    }} span={2} highlight={title !== initialQuestion.title} ref={(r) => {
      textAreaRefs.current[0] = r;
    }} />

    <StyledTextarea
      name="body"
      style={{
        minHeight: `${MIN_TEXTAREA_HEIGHT_px}px`,
        display: isFocused ? 'block' : 'none',
      }}
      onChange={(e) => onQuestionChange({ ...question, body: e.target.value })}
      onPaste={(e) => { e.preventDefault(); void processPaste(e) }}
      value={body} span={4} highlight={body !== initialQuestion.body} ref={(r) => {
        textAreaRefs.current[1] = r;
      }} />

    <div
      className="flex-[4_4_0%] tb-border p-2 font-sans [&>ul]:list-disc [&>ul]:list-inside [&>ol]:list-decimal [&>ol]:list-inside break-all"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={() => setIsFocused(true)}
      style={{
        minHeight: `${MIN_TEXTAREA_HEIGHT_px}px`,
        display: isFocused ? 'none' : 'block',
      }}
      ref={rendererRef}
    />

    <StyledInput name="difficulty" value={difficulty ?? 0} onChange={(e) => onQuestionChange({ ...question, difficulty: parseInt(e.target.value) }
    )} type="number" min="0" max="5" highlight={difficulty !== initialQuestion.difficulty} />

    <StyledTextarea name="category" value={category}
      style={{
        minHeight: `${MIN_TEXTAREA_HEIGHT_px}px`,
      }} onChange={(e) => onQuestionChange({ ...question, category: e.target.value })} span={2} highlight={category !== initialQuestion.category} ref={(r) => {
        textAreaRefs.current[2] = r;
      }} />
  </div>;
};
