import { type NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/Layout";
import { LoadingPage } from "~/components/Loading";
import { api } from "~/utils/api";

const SingleSubmissionDetailPage = (props: { submissionId: string }) => {
  const { query } = useRouter();
  const id = query.id ?? "";
  if (typeof id != "string") {
    throw new Error("invalid submission id: slug is not a string");
  }

  // mockdata
  const MOCK_SUBMISSION = { body: "def sum(x,y): return x+y" };
  const { data: submission, isLoading } = api.answer.getAnswerBody.useQuery({
    answerId: props.submissionId,
  });
  //   const { data: languages, isLoading: isLanguagesLoading } = api.judge.getLanguages.useQuery(undefined, {
  //     onError: (e) => {
  //       toast.error("Failed to fetch language: " + e.message);
  //     },
  //   });
  //   const language = languages?.find((l) => l.id === data.envlanguageId

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Submission Detail</title>
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
        <title>Submission Detail</title>
      </Head>
      <main className="h-screen bg-slate-900 text-slate-100 overflow-auto p-3">
        <div className="relative overflow-x-auto">
          {MOCK_SUBMISSION ? (
            <div>{MOCK_SUBMISSION.body}</div>
          ) : (
            <div>submission not found</div>
          )}
        </div>
      </main>
    </>
  );
};

export default SingleSubmissionDetailPage;
