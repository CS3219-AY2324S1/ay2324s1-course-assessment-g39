import { type HTMLAttributes } from "react";
import { StyledCheckbox } from "./StyledCheckbox";
import { StyledInput } from "./StyledInput";
import { type Question } from "./global";

export const QuestionRow = ({
  question, initialQuestion, onQuestionChange, onQuestionDelete, checked, indeterminate, ...others
}: {
  question: Question;
  initialQuestion: Question;
  onQuestionChange: (q: Question) => void;
  onQuestionDelete?: () => void;
  checked?: boolean;
  indeterminate?: boolean;
} & HTMLAttributes<HTMLDivElement>) => {
  const {
    title, body, difficulty, category
  } = question;

  return <div {...others}>

    {onQuestionDelete ?
      <StyledCheckbox onChange={onQuestionDelete} checked={checked} indeterminate={indeterminate} /> :
      <div className="aspect-square p-2 tb-border" />}

    <StyledInput name="title" value={title} onChange={(e) => {
      onQuestionChange({ ...question, title: e.target.value }
      );
    }} span={2} highlight={title !== initialQuestion.title} />

    <StyledInput name="body" value={body} onChange={(e) => onQuestionChange({ ...question, body: e.target.value }
    )} span={4} highlight={body !== initialQuestion.body} />

    <StyledInput name="difficulty" value={difficulty} onChange={(e) => onQuestionChange({ ...question, difficulty: parseInt(e.target.value) }
    )} type="number" min="0" max="5" highlight={difficulty !== initialQuestion.difficulty} />

    <StyledInput name="category" value={category} onChange={(e) => onQuestionChange({ ...question, category: e.target.value })} span={2} highlight={category !== initialQuestion.category} />
  </div>;
};
