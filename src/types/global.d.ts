export class Question {
  title = "";
  body = "";
  difficulty = 0;
  category = "";
  id = "";
}


// todo: dup code
type ModifyQuestionProps = {
  questionTitleList: { id: string; title: string }[];
  setQuestionId: (id: string) => void;
  currentQuestion: Question | null | undefined;
};

type ModifyTestCaseProps = {
  testCaseIdList: { id: string; description: string }[];
  currentTestCase: TestCase | undefined;
  setTestCaseId: (testCaseId: string) => void;
};

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
