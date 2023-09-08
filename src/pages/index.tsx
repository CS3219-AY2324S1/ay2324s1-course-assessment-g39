import Head from "next/head";
import { useRef, useState, type ButtonHTMLAttributes, type DetailedHTMLProps, type HTMLAttributes, type InputHTMLAttributes, useCallback } from "react";

import { api } from "~/utils/api";

interface Question {
  id: string;
  title: string;
  body: string;
  difficulty: number;
  category: string;
}


type Editable<R> = R & {
  edits: {
    [K in keyof R]: R[K]
  }
}

const baseQuestion = {
  id: "",
  title: "",
  body: "",
  difficulty: 0,
  category: "",
  edits: {
    id: "",
    title: "",
    body: "",
    difficulty: 0,
    category: "",
  }
} as Editable<Question>;


const StyledInput = ({ span, highlight, ...others }: {
  span?: number,
  highlight?: boolean
} & DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) =>
  <input
    className="outline-none tb-border min-w-0 p-2"
    style={{
      flex: span ? `${span} ${span} 0%` : '1 1 0%',
      backgroundColor: highlight ? 'var(--bg-3)' : 'transparent',
      ...others.style
    }}
    {...others}
  />

const StyledCheckbox = ({ indeterminate, ...others }: { indeterminate?: boolean } & DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
  const setInd = useCallback((el: HTMLInputElement) => {
    if (el) {
      el.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);
  return <div className="checkbox tb-border">
    <input type="checkbox" ref={setInd} {...others} />
    <span className="checkmark" />
  </div>
}

const StyledButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button className="self-start rounded-md al bg-white/10 flex-[2_2_0%] py-1 mt-2 font-bold text-white no-underline transition hover:bg-white/20" style={{ opacity: props.disabled ? 0.3 : 1 }} value="Add Question" {...props} />

const makeEditable = <T,>(l: T[]) => l.map((q) => (
  { ...q, edits: { ...q } } as Editable<T>
));

const QuestionRow = ({
  question,
  onQuestionChange,
  onQuestionDelete,
  highlight,
  checked,
  indeterminate,
  ...others
}: {
  question: Editable<Question>,
  onQuestionChange: (q: Question) => void,
  onQuestionDelete?: () => void,
  highlight?: boolean,
  checked?: boolean
  indeterminate?: boolean
} & HTMLAttributes<HTMLDivElement>) => {
  return <div {...others}>
    {onQuestionDelete ?
      <StyledCheckbox onChange={onQuestionDelete} checked={checked} indeterminate={indeterminate} /> :
      <div className="aspect-square p-2 tb-border" />
    }

    <StyledInput name="title" value={question.edits.title} onChange={(e) => {
      onQuestionChange({ ...question.edits, title: e.target.value }
      )
    }} span={2} highlight={highlight && question.title !== question.edits.title} />

    <StyledInput name="body" value={question.edits.body} onChange={(e) => onQuestionChange({ ...question.edits, body: e.target.value }
    )} span={4} highlight={highlight && question.body !== question.edits.body} />

    <StyledInput name="difficulty" value={question.edits.difficulty} onChange={(e) => onQuestionChange({ ...question.edits, difficulty: Number(e.target.value) }
    )} type="number" highlight={highlight && question.difficulty !== question.edits.difficulty} />

    <StyledInput name="category" value={question.edits.category} onChange={(e) => onQuestionChange({ ...question.edits, category: e.target.value }
    )} span={2} highlight={highlight && question.category !== question.edits.category} />
  </div>
}

const hasChanges = (q: Question) => Object.entries(q).some(([k, v]) => v !== baseQuestion[k as keyof Question]);

export default function Home() {

  const utils = api.useContext();
  const [dummyQuestion, setDummyQuestion] = useState(baseQuestion);

  const [isEditing, setIsEditing] = useState(false);

  const [questions, setQuestions] = useState<Editable<Question>[]>([]);
  const changedQuestions = useRef(new Set<number>());
  const [deletedQuestions, setDeletedQuestions] = useState(new Set<number>());

  api.question.getAll.useQuery(undefined, {
    onSuccess: (data) => {
      if (isEditing) return;
      setQuestions(makeEditable(data ?? []));
    }
  });
  const q_mutuation = api.question.addOne.useMutation({
    onSuccess: async () => {
      setIsEditing(false);
      setDummyQuestion(baseQuestion);
      await utils.question.getAll.invalidate();
    }
  });

  const q_update_mutuation = api.question.updateOne.useMutation({
    onSuccess: async () => {
      setIsEditing(false);
      await utils.question.getAll.invalidate();
    }
  });

  const q_delete_mutuation = api.question.deleteOne.useMutation({
    onSuccess: async () => {
      setIsEditing(false);
      await utils.question.getAll.invalidate();
    }
  });

  const saveNewQuestion = (q: Question) => {
    setDummyQuestion(prev => ({ ...prev, edits: { ...prev.edits, ...q } }));
  }

  const createNewQuestion = () => {
    if (!hasChanges(dummyQuestion)) return;
    q_mutuation.mutate(dummyQuestion.edits);
  };

  const saveUpdatedQuestion = (i: number, q: Question) => {
    setIsEditing(true);
    changedQuestions.current.add(i);
    setQuestions(prev => prev.map((prevQ, j) => j === i ? { ...prevQ, edits: { ...prevQ.edits, ...q } } : prevQ));
  }

  const updateQuestions = () => {
    changedQuestions.current.forEach((i) => {
      const q = questions[i];
      if (!q || !hasChanges(q)) return;
      q_update_mutuation.mutate(q.edits);
    });
    changedQuestions.current.clear();
  };

  const saveDeleteQuestion = (i: number) => {
    if (deletedQuestions.has(i)) {
      deletedQuestions.delete(i);
    } else {
      deletedQuestions.add(i);
    }
    setDeletedQuestions(new Set(deletedQuestions));
  }

  const toggleDeleteQuestion = () => {
    if (deletedQuestions.size === questions.length) {
      setDeletedQuestions(new Set());
    } else {
      setDeletedQuestions(new Set(questions.map((_, i) => i)));
    }
  }

  const deleteQuestions = () => {
    deletedQuestions.forEach((i) => {
      const q = questions[i];
      if (!q) return;
      q_delete_mutuation.mutate({ id: q.id });
    });
    setDeletedQuestions(new Set<number>());
  }

  return (
    <>
      <Head>
        <title>PeerPrep</title>
        <meta name="description" content="Supercharge your interview prep" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className=" flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[var(--bg-1)] to-[var(--bg-2)]">
        <div className="container flex flex-col items-center justify-center px-4 py-16 ">
          <h1 className="text-5xl font-extrabold tracking-tight mb-12 text-[var(--txt-3)] sm:text-[5rem]">
            Peer<span className="text-[var(--txt-1)]">Prep</span>
          </h1>

          {/* x - 2 - 4 - 1 - 2 */}
          <div className="text-[var(--txt-3)] flex-1 flex flex-col rounded overflow-hidden">
            <div className="flex font-bold bg-black">
              <StyledCheckbox
                checked={deletedQuestions.size > 0 && deletedQuestions.size === questions.length}
                indeterminate={deletedQuestions.size > 0 && deletedQuestions.size < questions.length}
                onChange={toggleDeleteQuestion}
              />
              <div className="flex-[2_2_0%] p-2 tb-border">titleS</div>
              <div className="flex-[4_4_0%] p-2 tb-border">body</div>
              <div className="flex-1 p-2 tb-border">difficulty</div>
              <div className="flex-[2_2_0%] p-2 tb-border">category</div>
            </div>
            {questions.map((question, i) => (
              <QuestionRow key={i} question={question}
                onQuestionChange={(q) => saveUpdatedQuestion(i, q)}
                onQuestionDelete={() => saveDeleteQuestion(i)}
                className="bg-[var(--bg-1)] flex font-mono hover:bg-[var(--bg-2)] active:bg-[var(--bg-2)]" highlight checked={deletedQuestions.has(i)} />
            ))}
            <QuestionRow question={dummyQuestion} onQuestionChange={saveNewQuestion} className="bg-[var(--bg-1)] flex mt-4 font-mono" />
            <div className="flex-1 flex gap-2">
              <StyledButton disabled={!hasChanges(dummyQuestion)} onClick={createNewQuestion}>Add Question</StyledButton>
              <StyledButton disabled={!isEditing} onClick={updateQuestions}>Save Changes</StyledButton>
              <StyledButton disabled={deletedQuestions.size === 0} onClick={deleteQuestions}>Delete Questions</StyledButton>
              <div className="flex-[5_5_0%]" />
            </div>
          </div>
        </div>
      </main >
    </>
  );
}

// function AuthShowcase() {
//   const { data: sessionData } = useSession();

//   const { data: secretMessage } = api.example.getSecretMessage.useQuery(
//     undefined, // no input
//     { enabled: sessionData?.user !== undefined }
//   );

//   return (
//     <div className="flex flex-col items-center justify-center gap-4">
//       <p className="text-center text-2xl text-white">
//         {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
//         {secretMessage && <span> - {secretMessage}</span>}
//       </p>
//       <button
//         className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
//         onClick={sessionData ? () => void signOut() : () => void signIn()}
//       >
//         {sessionData ? "Sign out" : "Sign in"}
//       </button>
//     </div>
//   );
// }
