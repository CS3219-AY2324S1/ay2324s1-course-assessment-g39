import Head from "next/head";
import { useRef, useState, type ButtonHTMLAttributes, type DetailedHTMLProps, type HTMLAttributes, type InputHTMLAttributes } from "react";

import { api } from "~/utils/api";

interface Question {
  id: string;
  title: string;
  body: string;
  difficulty: number;
  category: string;
}

const baseQuestion = {
  title: { value: "", edited: false, },
  body: { value: "", edited: false, },
  difficulty: { value: 0, edited: false, },
  category: { value: "", edited: false, },
}

type Editable<R> = {
  [Property in keyof R as Exclude<Property, "id" | "createdAt" | "updatedAt">]: {
    value: R[Property],
    edited: boolean,
  }
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

const StyledCheckbox = (props: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => <div className="checkbox tb-border">
  <input type="checkbox" {...props} />
  <span className="checkmark" />
</div>

const StyledButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button className="self-start rounded-md al bg-white/10 flex-[2_2_0%] py-1 mt-2 font-bold text-white no-underline transition hover:bg-white/20" style={{ opacity: props.disabled ? 0.3 : 1 }} value="Add Question" {...props} />

const QuestionRow = ({ question, onQuestionChange, highlight, ...others }: {
  question: Editable<Question>,
  onQuestionChange: (q: Editable<Question>) => void,
  highlight?: boolean,
} & HTMLAttributes<HTMLDivElement>) => {
  return <div {...others}>
    <StyledCheckbox />
    <StyledInput name="title" value={question.title.value} onChange={(e) => {
      onQuestionChange({
        ...question, title: { value: e.target.value, edited: true }
      })
    }} span={2} highlight={highlight && question.title.edited} />
    <StyledInput name="body" value={question.body.value} onChange={(e) => onQuestionChange({
      ...question, body: { value: e.target.value, edited: true }
    })} span={4} highlight={highlight && question.body.edited} />
    <StyledInput name="difficulty" type="number" value={question.difficulty.value} onChange={(e) => onQuestionChange({
      ...question, difficulty: { value: Number(e.target.value), edited: true }
    })} highlight={highlight && question.difficulty.edited} />
    <StyledInput name="category" value={question.category.value} onChange={(e) => onQuestionChange({
      ...question, category: { value: e.target.value, edited: true }
    })} span={2} highlight={highlight && question.category.edited} />
  </div>
}

const makeEditable = <T extends { id: string }>(l: T[]) => new Map(l.map((q) => (
  [q.id, Object.fromEntries(
    Object.entries(q)
      .map(([k, v]) => (
        k === 'id' ?
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          [k, v] : [k, { value: v, edited: false }]
      ))
  ) as Editable<T>]
)));

export default function Home() {

  const utils = api.useContext();
  const [dummyQuestion, setDummyQuestion] = useState(baseQuestion);

  const [newData, setNewData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);


  const [questions, setQuestions] = useState<Map<string, Editable<Question>>>(new Map());
  const changedQuestions = useRef(new Set<string>());

  api.question.getAll.useQuery(undefined, {
    onSuccess: (data) => {
      if (isEditing) return;
      setQuestions(makeEditable(data ?? []));
    }
  });
  const q_mutuation = api.question.addOne.useMutation({
    onSuccess: async () => {
      setNewData(false);
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

  const saveNewQuestion = (q: typeof baseQuestion) => {
    setDummyQuestion(q);
    setNewData(true);
  }

  const createNewQuestion = () => {
    const newQuestion = Object.fromEntries(
      Object.entries(dummyQuestion)
        .map(([k, v]) => (
          k === 'id' ?
            [k, v] : [k, v.value]
        ))
    ) as Question;
    q_mutuation.mutate(newQuestion);
  };

  const saveUpdatedQuestion = (id: string, q: Editable<Question>) => {
    console.log(changedQuestions.current);
    setIsEditing(true);
    changedQuestions.current.add(id);
    setQuestions(new Map(questions.set(id, q)));
  }

  const updateQuestions = () => {
    changedQuestions.current.forEach((id) => {
      const q = questions.get(id);
      if (!q) return;
      const updatedQuestion = Object.fromEntries(
        Object.entries(q)
          .map(([k, v]) => (
            k === 'id' ?
              [k, v] : [k, v.value]
          ))
      ) as Question;
      q_update_mutuation.mutate(updatedQuestion);
    });
  };

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
              <StyledCheckbox />
              <div className="flex-[2_2_0%] p-2 tb-border">titleS</div>
              <div className="flex-[4_4_0%] p-2 tb-border">body</div>
              <div className="flex-1 p-2 tb-border">difficulty</div>
              <div className="flex-[2_2_0%] p-2 tb-border">category</div>
            </div>
            {Array.from(questions).map(([id, question]) => (
              <QuestionRow key={id} question={question} onQuestionChange={(q) => saveUpdatedQuestion(id, q)} className="bg-[var(--bg-1)] flex font-mono hover:bg-[var(--bg-2)] active:bg-[var(--bg-2)]" highlight />
            ))}
            <QuestionRow question={dummyQuestion} onQuestionChange={saveNewQuestion} className="bg-[var(--bg-1)] flex mt-4 font-mono" />
            <div className="flex-1 flex gap-2">
              <StyledButton disabled={!newData} onClick={createNewQuestion}>Add Question</StyledButton>
              <StyledButton disabled={!isEditing} onClick={updateQuestions}>Save Changes</StyledButton>
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
