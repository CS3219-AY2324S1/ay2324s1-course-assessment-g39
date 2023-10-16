import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";
import supersub from "remark-supersub";
import { LanguageName } from "@uiw/codemirror-extensions-langs";

export const makeMap = <T, K extends keyof T & string>(l: T[], k: K) =>
  new Map(l.map((q) => [q[k], q]));

export const parseMD = async (md: string) =>
  String(// Remove when this closes: https://github.com/orgs/remarkjs/discussions/1214
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await unified().use(remarkParse, { fragment: true }).use(remarkGfm).use(supersub).use(remarkRehype)
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

export function getLanguage(language: string): LanguageName | undefined {
  const l = language.toLowerCase();

  if (!l.includes("c++") && (l.includes("gcc") || l.includes("clang"))) {
    return "c";
  }
  if (l.includes("c++")) {
    return "cpp";
  }
  if (l.includes("java")) {
    return "java";
  }

  if (l.includes("python")) {
    return "python";
  }
  // default to markdown
  return undefined;
}

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


/**
 * A lock for synchronizing async operations.
 * Use this to protect a critical section
 * from getting modified by multiple async operations
 * at the same time.
 * https://dev.to/0916dhkim/simple-typescript-mutex-implementation-5544
 */
export class Mutex {
  /**
   * When multiple operations attempt to acquire the lock,
   * this queue remembers the order of operations.
   */
  private _queue: {
      resolve: (release: ReleaseFunction) => void;
  }[] = [];

  private _isLocked = false;

  /**
   * Wait until the lock is acquired.
   * @returns A function that releases the acquired lock.
   */
  acquire() {
      return new Promise<ReleaseFunction>((resolve) => {
          this._queue.push({resolve});
          this._dispatch();
      });
  }

  /**
   * Enqueue a function to be run serially.
   * 
   * This ensures no other functions will start running
   * until `callback` finishes running.
   * @param callback Function to be run exclusively.
   * @returns The return value of `callback`.
   */
  async runExclusive<T>(callback: () => Promise<T>) {
      const release = await this.acquire();
      try {
          return await callback();
      } finally {
          release();
      }
  }

  /**
   * Check the availability of the resource
   * and provide access to the next operation in the queue.
   *
   * _dispatch is called whenever availability changes,
   * such as after lock acquire request or lock release.
   */
  private _dispatch() {
      if (this._isLocked) {
          // The resource is still locked.
          // Wait until next time.
          return;
      }
      const nextEntry = this._queue.shift();
      if (!nextEntry) {
          // There is nothing in the queue.
          // Do nothing until next dispatch.
          return;
      }
      // The resource is available.
      this._isLocked = true; // Lock it.
      // and give access to the next operation
      // in the queue.
      nextEntry.resolve(this._buildRelease());
  }

  /**
   * Build a release function for each operation
   * so that it can release the lock after
   * the operation is complete.
   */
  private _buildRelease(): ReleaseFunction {
      return () => {
          // Each release function make
          // the resource available again
          this._isLocked = false;
          // and call dispatch.
          this._dispatch();
      };
  }
}

type ReleaseFunction = () => void;