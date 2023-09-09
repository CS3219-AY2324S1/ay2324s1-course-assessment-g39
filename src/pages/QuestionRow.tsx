import { type HTMLAttributes } from "react";
import { type Question } from "./global";
import { StyledInput } from "./StyledInput";
import { StyledCheckbox } from "./StyledCheckbox";

export const QuestionRow = ({
  question, initialQuestion, onQuestionChange, onQuestionDelete, highlight, checked, indeterminate, ...others
}: {
  question: Question;
  initialQuestion?: Question;
  onQuestionChange: (q: Question) => void;
  onQuestionDelete?: () => void;
  highlight?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
} & HTMLAttributes<HTMLDivElement>) => {
  const highlightable = highlight && initialQuestion;
  return <div {...others}>

    {onQuestionDelete ?
      <StyledCheckbox onChange={onQuestionDelete} checked={checked} indeterminate={indeterminate} /> :
      <div className="aspect-square p-2 tb-border" />}

    <StyledInput name="title" value={question.title} onChange={(e) => {
      onQuestionChange({ ...question, title: e.target.value }
      );
    }} span={2} highlight={highlightable && question.title !== initialQuestion.title} />

    <StyledInput name="body" value={question.body} onChange={(e) => onQuestionChange({ ...question, body: e.target.value }
    )} span={4} highlight={highlightable && question.body !== initialQuestion.body} />

    <StyledInput name="difficulty" value={question.difficulty} onChange={(e) => onQuestionChange({ ...question, difficulty: parseInt(e.target.value) }
    )} type="number" min="0" max="5" highlight={highlightable && question.difficulty !== initialQuestion.difficulty} />

    <StyledInput name="category" value={question.category} onChange={(e) => onQuestionChange({ ...question, category: e.target.value })} span={2} highlight={highlightable && question.category !== initialQuestion.category} />
  </div>;
};
