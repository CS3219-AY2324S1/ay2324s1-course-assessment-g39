
/* TODO:
  body html rendering
  Better variable names
  Handle D-U desync
*/
export const makeMap = <T, K extends keyof T & string>(l: T[], k: K) => new Map(l.map((q) => (
  [q[k], q]
)));
export const equals = <T extends object>(q1: T, q2: T) => Object.entries(q1).every(([k, v]) => q2[k as keyof T] === v);
