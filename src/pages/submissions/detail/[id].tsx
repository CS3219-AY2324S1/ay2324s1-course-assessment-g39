import Head from "next/head";
import { useRouter } from "next/router";
import { PageLayout } from "~/components/Layout";
import { LoadingPage } from "~/components/Loading";
import { api } from "~/utils/api";

const SingleSubmissionDetailPage = (props: { submissionId: string }) => {
  const { query } = useRouter();
  const id = query.id ?? "";
  if (typeof id != "string") {
    throw new Error("invalid submission id: slug is not a string");
  }

  // TODO: remove mockdata
  // const MOCK_SUBMISSION = { body: "def sum(x,y): return x+y" };

  const { data: submission, isLoading } = api.answer.getAnswerBody.useQuery({
    answerId: props.submissionId,
  });

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

  if (!submission) {
    return (
      <>
        <Head>
          <title>Submission Detail</title>
        </Head>
        <main className="h-screen bg-slate-900 text-slate-100 overflow-auto p-3">
          <div className="relative overflow-x-auto">
            <div>Error 404 not found</div>
          </div>
        </main>
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
          <label className="w-full mb-10 flex-1 block text-sm font-medium text-gray-900 dark:text-white">
            Code
            <textarea
              name="source_code"
              id="source_code"
              className="mt-3 h-full min-h-[10rem] w-full p-2 font-mono box-border bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white "
              value={submission.body}
              readOnly
            />
          </label>
        </div>
      </main>
    </>
  );
};

export default SingleSubmissionDetailPage;
