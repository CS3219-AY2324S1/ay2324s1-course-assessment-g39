export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export const difficulties = ["EASY", "MEDIUM", "HARD"] as const;

export class Question {
  title = "";
  body = "";
  difficulty = "EASY" as Difficulty;
  category = "";
}

export type QuestionMap = Map<string, Question>;
