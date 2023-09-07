import { type ChangeEvent, useState, type HTMLInputTypeAttribute } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";

import { api } from "~/utils/api";

interface inpProps {
  name: string;
  type?: HTMLInputTypeAttribute;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

const StyledInput = ({ name, type, value, onChange }: inpProps) => <td className="border px-4 py-2">
  <input className="bg-transparent outline-none border-0"
    name={name}
    type={type ?? 'text'}
    value={value}
    onChange={onChange}
  />
</td>;

export default function Home() {
  const questions = api.question.getAll.useQuery();
  const [dummyQuestion, setDummyQuestion] = useState({
    title: '',
    body: '',
    difficulty: 0,
    description: '',
  });
  const [newData, setNewData] = useState(false);

  const createQuestion = () => {
    // TODO
  };

  return (
    <>
      <Head>
        <title>PeerPrep</title>
        <meta name="description" content="Supercharge your interview prep" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className=" flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[var(--bg-1)] to-[var(--bg-2)]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-5xl font-extrabold tracking-tight text-[var(--txt-3)] sm:text-[5rem]">
            Peer<span className="text-[var(--txt-1)]">Prep</span>
          </h1>
          <button onClick={createQuestion} className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20" value="Add Question">Add Question</button>
          <table className="table-auto text-[var(--txt-3)]">
            <thead>
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Body</th>
                <th className="px-4 py-2">Difficulty</th>
                <th className="px-4 py-2">Category</th>
              </tr>
            </thead>
            <tbody>
              {questions.data?.map((question) => (
                <tr key={question.id}>
                  <td className="border px-4 py-2">{question.title}</td>
                  <td className="border px-4 py-2">{question.body}</td>
                  <td className="border px-4 py-2">{question.difficulty}</td>
                  <td className="border px-4 py-2">{question.category}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {/* <StyledFormInitInputCell name="title" onSubmit={createQuestion} />
                <StyledInputCell name="body" />
                <StyledInputCell name="difficulty" type="number" />
                <StyledInputCell name="description" /> */}
                <StyledInput name="title" value={dummyQuestion.title} onChange={(e) => setDummyQuestion({ ...dummyQuestion, title: e.target.value })} />
                <StyledInput name="body" value={dummyQuestion.body} onChange={(e) => setDummyQuestion({ ...dummyQuestion, body: e.target.value })} />
                <StyledInput name="difficulty" type="number" value={dummyQuestion.difficulty} onChange={(e) => setDummyQuestion({ ...dummyQuestion, difficulty: Number(e.target.value) })} />
                <StyledInput name="description" value={dummyQuestion.description} onChange={(e) => setDummyQuestion({ ...dummyQuestion, description: e.target.value })} />
              </tr>
            </tfoot>
          </table>
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
