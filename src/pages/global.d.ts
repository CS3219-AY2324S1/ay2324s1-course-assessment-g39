export class Question {
  title = "";
  body = "";
  difficulty = 0;
  category = "";
}

export type QuestionMap = Map<string, Question>;export const equals = <T extends object>(q1: T, q2: T) => Object.entries(q1).every(([k, v]) => q2[k as keyof T] === v);

