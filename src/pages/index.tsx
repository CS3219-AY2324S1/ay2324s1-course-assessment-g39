import { type ChangeEvent, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";

import { api } from "~/utils/api";

export default function Home() {
  const questions = api.question.getAll.useQuery();
  const [dummyQuestion, setDummyQuestion] = useState({
    title: "",
    body: "",
    difficulty: "",
    category: "",
  });
  const [newData, setNewData] = useState(false);

  const StyledInputCell = ({ value }: { value: string }) => (
    <td className="border px-4 py-2">
      <input className="bg-transparent outline-none border-0" type="text" value={value} />
    </td>
  )

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
          {newData && <button>Add Question</button>}
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
                <StyledInputCell value={dummyQuestion.title}  />
                <StyledInputCell value={dummyQuestion.body}  />
                <StyledInputCell value={dummyQuestion.difficulty}  />
                <StyledInputCell value={dummyQuestion.category}  />
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
