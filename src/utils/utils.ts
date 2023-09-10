import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import { unified } from "unified";

export const makeMap = <T, K extends keyof T & string>(l: T[], k: K) =>
  new Map(l.map((q) => [q[k], q]));

export const parseMD = async (md: string) =>
  // Remove when this closes: https://github.com/orgs/remarkjs/discussions/1214
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  String(await unified().use(remarkParse).use(remarkHtml).process(md)).replace(/href/g, "target='_blank' rel='noopener noreferrer' href");

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
