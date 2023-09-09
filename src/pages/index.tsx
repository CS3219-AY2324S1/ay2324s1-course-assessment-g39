import Head from "next/head";
import { type } from "os";
import { useRef, useState, type ButtonHTMLAttributes, type DetailedHTMLProps, type HTMLAttributes, type InputHTMLAttributes, useCallback } from "react";

import { api } from "~/utils/api";

/* TODO:
  body html rendering
  Better variable names
  Handle D-U desync
*/

const makeMap = <T, K extends keyof T & string>(l: T[], k: K) => new Map(l.map((q) => (
  [q[k], q]
)));

interface Question {
  title: string;
  body: string;
  difficulty: number;
  category: string;
}

type QuestionMap = Map<string, Question>;

const baseQuestion: Question = {
  title: "",
  body: "",
  difficulty: 0,
  category: "",
}


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

const QuestionRow = ({
  question,
  initialQuestion,
  onQuestionChange,
  onQuestionDelete,
  highlight,
  checked,
  indeterminate,
  ...others
}: {
  question: Question,
  initialQuestion?: Question,
  onQuestionChange: (q: Question) => void,
  onQuestionDelete?: () => void,
  highlight?: boolean,
  checked?: boolean
  indeterminate?: boolean
} & HTMLAttributes<HTMLDivElement>) => {
  const highlightable = highlight && initialQuestion;
  return <div {...others}>

    {onQuestionDelete ?
      <StyledCheckbox onChange={onQuestionDelete} checked={checked} indeterminate={indeterminate} /> :
      <div className="aspect-square p-2 tb-border" />
    }

    <StyledInput name="title" value={question.title} onChange={(e) => {
      onQuestionChange({ ...question, title: e.target.value }
      )
    }} span={2} highlight={highlightable && question.title !== initialQuestion.title} />

    <StyledInput name="body" value={question.body} onChange={(e) => onQuestionChange({ ...question, body: e.target.value }
    )} span={4} highlight={highlightable && question.body !== initialQuestion.body} />

    <StyledInput name="difficulty" value={question.difficulty} onChange={(e) => onQuestionChange({ ...question, difficulty: parseInt(e.target.value) }
    )} type="number" min="0" max="5" highlight={highlightable && question.difficulty !== initialQuestion.difficulty} />

    <StyledInput name="category" value={question.category} onChange={(e) => onQuestionChange({ ...question, category: e.target.value })} span={2} highlight={highlightable && question.category !== initialQuestion.category} />
  </div>
}

const equals = <T extends object>(q1: T, q2: T) => Object.entries(q1).every(([k, v]) => q2[k as keyof T] === v);

export default function Home() {

  const utils = api.useContext();

  const [questions, setQuestions] = useState<QuestionMap>(new Map());
  const [dummyQuestion, setDummyQuestion] = useState(baseQuestion);
  const [changedQuestions, setChangedQuestions] = useState(new Set<string>());
  const [deletedQuestions, setDeletedQuestions] = useState(new Set<string>());

  const rawQuestions = makeMap(api.question.getAll.useQuery(undefined, {
    onSuccess: (data) => {
      const mappedData = data.map((q) => ({
        id: q.id,
        ...(changedQuestions.has(q.id) ? questions.get(q.id) ?? q : q)
      }));
      setQuestions(makeMap(mappedData, 'id'));
    }
  }).data ?? [], 'id');

  const hasChanges = (id: string) => {
    const q1 = rawQuestions.get(id);
    const q2 = questions.get(id);
    return q1 && q2 && !equals(q1, q2);
  }

  const q_mutuation = api.question.addOne.useMutation({
    onSuccess: async () => {
      await utils.question.getAll.invalidate();
    }
  });

  const q_update_mutuation = api.question.updateOne.useMutation({
    onSuccess: async () => {
      await utils.question.getAll.invalidate();
    }
  });

  const q_delete_mutuation = api.question.deleteOne.useMutation({
    onSuccess: async () => {
      await utils.question.getAll.invalidate();
    }
  });

  const createNewQuestion = () => {
    if (equals(dummyQuestion, baseQuestion)) return;
    q_mutuation.mutate(dummyQuestion, {
      onSuccess: () => {
        setDummyQuestion(baseQuestion);
      }
    });
  };

  const saveUpdatedQuestion = (id: string, q: Question) => {
    setChangedQuestions(new Set(changedQuestions.add(id)));
    setQuestions(new Map(questions.set(id, q)));
  }

  const updateQuestions = () => {
    changedQuestions.forEach((id) => {
      if (!hasChanges(id)) return;
      q_update_mutuation.mutate({ id, ...questions.get(id) });
    });
    setChangedQuestions(new Set());
  };

  const saveDeleteQuestion = (id: string) => {
    if (deletedQuestions.has(id)) {
      deletedQuestions.delete(id);
    } else {
      deletedQuestions.add(id);
    }
    setDeletedQuestions(new Set(deletedQuestions));
  }

  const toggleDeleteQuestion = () => {
    if (deletedQuestions.size === questions.size) {
      setDeletedQuestions(new Set());
    } else {
      setDeletedQuestions(new Set(questions.keys()));
    }
  }

  const deleteQuestions = () => {
    deletedQuestions.forEach((id => {
      if (!rawQuestions.has(id)) return;
      changedQuestions.delete(id) && setChangedQuestions(new Set(changedQuestions));
      q_delete_mutuation.mutate({ id });
    }));
    setDeletedQuestions(new Set());
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
                checked={deletedQuestions.size > 0 && deletedQuestions.size === questions.size}
                indeterminate={deletedQuestions.size > 0 && deletedQuestions.size < questions.size}
                onChange={toggleDeleteQuestion}
              />
              <div className="flex-[2_2_0%] p-2 tb-border">titleS</div>
              <div className="flex-[4_4_0%] p-2 tb-border">body</div>
              <div className="flex-1 p-2 tb-border">difficulty</div>
              <div className="flex-[2_2_0%] p-2 tb-border">category</div>
            </div>
            {[...questions.entries()].map(([id, q]) => (
              <QuestionRow key={id} question={q}
                initialQuestion={rawQuestions.get(id)}
                onQuestionChange={(q) => saveUpdatedQuestion(id, q)}
                onQuestionDelete={() => saveDeleteQuestion(id)}
                className="bg-[var(--bg-1)] flex font-mono hover:bg-[var(--bg-2)] active:bg-[var(--bg-2)]" highlight checked={deletedQuestions.has(id)} />
            ))}
            <QuestionRow question={dummyQuestion} initialQuestion={baseQuestion} onQuestionChange={setDummyQuestion} className="bg-[var(--bg-1)] flex mt-4 font-mono" />
            <div className="flex-1 flex gap-2">
              <StyledButton disabled={equals(dummyQuestion, baseQuestion)} onClick={createNewQuestion}>Add Question</StyledButton>
              <StyledButton disabled={changedQuestions.size === 0} onClick={updateQuestions}>Save Changes</StyledButton>
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
