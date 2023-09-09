
export interface Question {
  title: string;
  body: string;
  difficulty: number;
  category: string;
}
export type QuestionMap = Map<string, Question>;
