export class Question {
  title = "";
  body = "";
  difficulty = 0;
  category = "";
}



export type Language = {
  id: number;
  name: string;
};

export type TestCase = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  environmentId: string;
  description: string;
  hint: string | null;
  test: string;
  input: string | null;
  output: string | null;
  timeLimit: number | null;
  memoryLimit: number | null;
}

export type CodeOutput = {
  stdout: string | null;
  time: string;
  memory: number;
  stderr: string | null;
  token: string;
  compile_output: string | null;
  message: string | null;
  status: { id: number; description: string };
};

export type QuestionMap = Map<string, Question>;
