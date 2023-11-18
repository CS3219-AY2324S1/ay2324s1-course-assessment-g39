import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type HTMLAttributes } from "react";
import { z } from "zod";
import useDebounce from "~/hooks/useDebounce";
import { api } from "~/utils/api";
import { difficulties, type Difficulty, type Question } from "~/types/global";
import { parseMD, pasteText } from "../utils/utils";
import { StyledCheckbox } from "./StyledCheckbox";
import { StyledSelect, StyledTextarea } from "./StyledInput";

const MIN_TEXTAREA_HEIGHT_px = 41;
const MAX_TEXTAREA_HEIGHT_px = MIN_TEXTAREA_HEIGHT_px * 2;
const MAX_TEXTAREA_EDITING_HEIGHT_px = MIN_TEXTAREA_HEIGHT_px * 16;

enum BODY_STATE {
  COLLAPSED,
  EXPANDED,
  EDITING
}
const { COLLAPSED, EXPANDED, EDITING } = BODY_STATE;

type QuestionRowProps = {
  question: Question;
  initialQuestion: Question;
  onQuestionChange: (q: Question) => void;
  onQuestionDelete?: () => void;
  checked?: boolean;
  indeterminate?: boolean;
  editable?: boolean;
} & HTMLAttributes<HTMLDivElement>;
export const QuestionRow = (props: QuestionRowProps) => {
  const {
    question, initialQuestion,
    onQuestionChange, onQuestionDelete,
    checked, indeterminate,
    editable,
    ...others
  } = props;
  const { title, body, difficulty, category } = question;

  const [bodyState, initSetBodyState] = useState(BODY_STATE.COLLAPSED);

  const setBodyState = (bodyState: BODY_STATE) => {
    if (!editable && bodyState == EDITING) return;
    initSetBodyState(bodyState);
  };

  const debouncedBodyState = useDebounce(bodyState, 100);
  const prevBodyState = useRef(bodyState);
  const [html, setHTML] = useState('');

  const textAreaRefs = useRef<(HTMLTextAreaElement | null)[]>([null, null, null]);
  const rendererRef = useRef<HTMLDivElement | null>(null);

  const getPresignedUrl = api.form.createPresignedUrl.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: false
  });

  const processPaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    for (const types of e.clipboardData.types) {
      if (types === 'text/plain') {
        const text = e.clipboardData.getData(types);
        if (z.string().url().safeParse(text).success) {
          pasteText(textAreaRefs.current[1], `[link](${text})`);
        } else {
          pasteText(textAreaRefs.current[1], text);
        }
        onQuestionChange({ ...question, body: textAreaRefs.current[1]!.value });
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
            onQuestionChange({ ...question, body: textAreaRefs.current[1]!.value });
          }
          return;
        }
      }
    }
  }

  useEffect(() => {
    void (async () => setHTML((await parseMD(body))))();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (debouncedBodyState === EDITING && textAreaRefs.current[1] !== document.activeElement) {
      textAreaRefs.current[1]?.focus();
    }
    void (async () => setHTML((await parseMD(body))))();
    prevBodyState.current = debouncedBodyState;
  }, [debouncedBodyState, body]);

  useLayoutEffect(() => {
    textAreaRefs.current.forEach(r => {
      if (r) {
        r.style.height = `${MIN_TEXTAREA_HEIGHT_px}px`;
      }
    });
    let maxHeight = Infinity;
    if (bodyState === COLLAPSED) {
      maxHeight = MAX_TEXTAREA_HEIGHT_px;
    } else if (bodyState === EDITING) {
      maxHeight = MAX_TEXTAREA_EDITING_HEIGHT_px;
    }
    const height = Math.min(Math.max(
      ...textAreaRefs.current.map(r => r?.scrollHeight ?? 0),
      bodyState === EDITING ? 0 : rendererRef.current!.scrollHeight,
      MIN_TEXTAREA_HEIGHT_px
    ), maxHeight);
    textAreaRefs.current.forEach(r => {
      if (r) {
        r.style.height = `${height}px`;
      }
    });
    rendererRef.current!.style.height = `${height}px`;
    if (bodyState === EDITING) {
      window.scrollTo({
        top: textAreaRefs.current[1]!.offsetTop - 100,
      });
    }
  }, [body, html, bodyState]);

  return <div {...others}>

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
    }}
    disabled={!editable}
    />

    <StyledTextarea
      name="body"
      onBlur={() => {
        setBodyState(COLLAPSED);
      }}
      style={{
        minHeight: `${MIN_TEXTAREA_HEIGHT_px}px`,
        display: bodyState === EDITING ? 'block' : 'none',
      }}
      onChange={(e) =>
        onQuestionChange({ ...question, body: e.target.value })
      }
      // onKeyDown={handleKey}
      onPaste={(e) => { e.preventDefault(); void processPaste(e) }}
      value={body} span={4} highlight={body !== initialQuestion.body} ref={(r) => {
        textAreaRefs.current[1] = r;
      }} />

    <div
      tabIndex={0}
      onClick={() => {
        if (bodyState === COLLAPSED) {
          setBodyState(EXPANDED);
        } else if (bodyState === EXPANDED) {
          setBodyState(EDITING);
        }
      }}
      onBlur={() => {
        if (bodyState === EXPANDED) {
          setBodyState(COLLAPSED);
        }
      }}
      className={`flex-[4_4_0%] tb-border p-2 font-sans [&>ul]:list-disc [&>ul]:list-inside [&>ol]:list-decimal [&>ol]:list-inside break-word relative overflow-hidden ${bodyState === COLLAPSED ? '' : 'after:content-none'} after:w-full after:h-10 after:absolute after:left-0 after:top-0 after:translate-y-full after:bg-gradient-to-b after:from-transparent after:to-[var(--bg-1)]`}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        minHeight: `${MIN_TEXTAREA_HEIGHT_px}px`,
        display: bodyState === EDITING ? 'none' : 'block',
        backgroundColor: body !== initialQuestion.body ? 'var(--bg-3)' : 'transparent',
      }}
      ref={rendererRef}
    />

    <StyledSelect name="difficulty" value={difficulty} onChange={(e) => onQuestionChange({ ...question, difficulty: e.target.value as Difficulty })} span={1}
      highlight={difficulty !== initialQuestion.difficulty}
      disabled={!editable} >
      {
        difficulties.map((d, i) => <option key={i} value={d}>{d}</option>)
      }
    </StyledSelect>

    <StyledTextarea name="category" value={category}
      style={{
        minHeight: `${MIN_TEXTAREA_HEIGHT_px}px`,
      }} onChange={(e) => onQuestionChange({ ...question, category: e.target.value })} span={2} highlight={category !== initialQuestion.category} ref={(r) => {
        textAreaRefs.current[2] = r;
      }}
      disabled={!editable} />
  </div>;
};
