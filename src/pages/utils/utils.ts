
/* TODO:
  body html rendering
  Better variable names
*/
export const makeMap = <T, K extends keyof T & string>(l: T[], k: K) => new Map(l.map((q) => (
  [q[k], q]
)));
