import Head from "next/head";
import router, { useRouter } from "next/router";
import { PageLayout } from "~/components/Layout";
import { api } from "~/utils/api";
import { useSession } from "next-auth/react";
import { LoadingPage } from "~/components/Loading";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const UserSubmissions = ({ userId }: { userId: string }) => {
  // session is `null` until nextauth fetches user's session data
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      void router.push("/sign-in");
    },
  });

  // MOCK DATA remove when tested with real data
  const mockDate = new Date("2022-12-17T03:24:00");
  const mockUserSubmissions = [
    {
      questionTitle: "Some Question Title",
      answerId: "1",
      attemptedOn: mockDate,
      result: "ACCEPTED",
      language: "Python 3",
    },
    {
      questionTitle: "Some Question Title",
      answerId: "1",
      attemptedOn: mockDate,
      result: "WRONG_ANSWER",
      language: "Python 3",
    },
  ];

  const { data: userSubmissions = [], isLoading: userSubmissionsLoading } =
    api.answer.getUserSubmissions.useQuery();

  if (!session || userSubmissionsLoading) {
    return (
      <>
        <Head>
          <title>Submission</title>
        </Head>
        <PageLayout>
          <LoadingPage />
        </PageLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Submission</title>
      </Head>
      <main className="h-screen bg-slate-900 text-slate-100 overflow-auto p-3">
        <div className="relative overflow-x-auto">
          <div className="py-4">All my submissions</div>
          <table className="w-full text-sm text-left text-gray-500 dark:text-slate-300">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-slate-200">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Time Submitted
                </th>
                <th scope="col" className="px-6 py-3">
                  Question
                </th>
                <th scope="col" className="px-6 py-3">
                  Status
                </th>
                <th scope="col" className="px-6 py-3">
                  Language
                </th>
              </tr>
            </thead>
            <tbody className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              {/* {userSubmissions.map((submission) => ( */}
              {mockUserSubmissions.map((submission) => (
                <tr className="hover:bg-gray-700">
                  <td className="px-6 py-4">
                    {dayjs(submission.attemptedOn).fromNow()}
                  </td>
                  <td className="px-6 py-4">{submission.questionTitle}</td>
                  <td className="px-6 py-4">
                    <button
                      className="hover:underline"
                      onClick={() =>
                        router.push(
                          `/submissions/detail/${submission.answerId}`,
                        )
                      }
                    >
                      {submission.result}
                    </button>
                  </td>
                  <td className="px-6 py-4">{submission.language}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
};

export default UserSubmissions;
