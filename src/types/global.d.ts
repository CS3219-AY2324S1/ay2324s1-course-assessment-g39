export class Question {
  title = "";
  body = "";
  difficulty = 0;
  category = "";
}

export type QuestionMap = Map<string, Question>;
