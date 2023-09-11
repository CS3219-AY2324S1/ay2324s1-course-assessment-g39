import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";

export const makeMap = <T, K extends keyof T & string>(l: T[], k: K) =>
  new Map(l.map((q) => [q[k], q]));

export const parseMD = async (md: string) =>
  // Remove when this closes: https://github.com/orgs/remarkjs/discussions/1214
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  String( await unified().use(remarkParse, {fragment: true}).use(remarkGfm).use(remarkRehype)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .process(md),
  ).replace(/href/g, "target='_blank' rel='noopener noreferrer' href");

export const equals = <T extends object>(q1: T, q2: T) =>
  Object.entries(q1).every(([k, v]) => q2[k as keyof T] === v);

export const pasteText = (
  inputRef: HTMLTextAreaElement | null | undefined,
  text: string,
) => {
  inputRef?.setRangeText(
    text,
    inputRef.selectionStart,
    inputRef.selectionEnd,
    "end",
  );
};

export const bracket = (
  inputRef: HTMLTextAreaElement | null | undefined,
  left: string,
  right = left,
) => {
  const start = inputRef?.selectionStart;
  const end = inputRef?.selectionEnd;
  if (start === undefined || end === undefined) return;
  const selected = inputRef?.value.substring(start, end);
  if (selected === undefined) return;
  pasteText(inputRef, `${left}${selected}${right}`);
  inputRef?.focus();
  inputRef?.setSelectionRange(start + left.length, end + left.length);
};
