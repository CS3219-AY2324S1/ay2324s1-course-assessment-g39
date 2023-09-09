import Head from "next/head";
import { useState } from "react";

import { api } from "~/utils/api";
import { makeMap } from "./utils/utils";
import { type Question, type QuestionMap } from "./global";
import { StyledCheckbox } from "./StyledCheckbox";
import { StyledButton } from "./StyledButton";
import { QuestionRow } from "./QuestionRow";
import { equals } from "./utils/utils";

const baseQuestion: Question = {
  title: "",
  body: "",
  difficulty: 0,
  category: "",
}

export default function Home() {

  const utils = api.useContext();

  const [questions, setQuestions] = useState<QuestionMap>(new Map());
  const [dummyQuestion, setDummyQuestion] = useState(baseQuestion);
  const [changedQuestions, setChangedQuestions] = useState(new Set<string>());
  const [deletedQuestions, setDeletedQuestions] = useState(new Set<string>());

  // const rawQuestions = makeMap(api.question.getAll.useQuery(undefined, {
  //   onSuccess: (data) => {
  //     const mappedData = data.map((q) => ({
  //       id: q.id,
  //       ...(changedQuestions.has(q.id) ? questions.get(q.id) ?? q : q)
  //     }));
  //     setQuestions(makeMap(mappedData, 'id'));
  //   }
  // }).data ?? [], 'id');

  const rawQuestions = makeMap(api.useQueries(
    (t) => api.question.getAllIds.useQuery().data?.map((id) => t.question.getOne(id, {
      onSuccess: (data) => {
        if (!data || changedQuestions.has(data.id)) return;
        setQuestions(new Map(questions.set(data.id, data)));
      }
    })) ?? []
  ).filter((q) => q.data).map((q) => q.data!), 'id');


  const hasChanges = (id: string) => {
    const q1 = rawQuestions.get(id);
    const q2 = questions.get(id);
    return q1 && q2 && !equals(q1, q2);
  }

  const addMutation = api.question.addOne.useMutation({
    onSuccess: () => {
      void utils.question.getAllIds.invalidate();
    }
  });

  const updateMutation = api.question.updateOne.useMutation();

  const deleteMutation = api.question.deleteOne.useMutation();

  const createNewQuestion = () => {
    if (equals(dummyQuestion, baseQuestion)) return;
    addMutation.mutate(dummyQuestion, {
      onSuccess: () => {
        setDummyQuestion(baseQuestion);
      }
    });
  };

  const saveUpdatedQuestion = (id: string, q: Question) => {
    setQuestions(new Map(questions.set(id, q)));
    if (!hasChanges(id)) {
      changedQuestions.delete(id);
    } else {
      changedQuestions.add(id);
    }
  }

  const updateQuestions = () => {
    changedQuestions.forEach((id) => {
      if (!hasChanges(id)) return;
      updateMutation.mutate({ id, ...questions.get(id) }, {
        onSuccess: () => {
          void utils.question.getOne.invalidate({ id });
        }
      });
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
      if (!rawQuestions.has(id)) {
        questions.delete(id);
        return;
      }
      changedQuestions.delete(id) && setChangedQuestions(new Set(changedQuestions));
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          void utils.question.getAllIds.invalidate();
          questions.delete(id);
        }
      });
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
