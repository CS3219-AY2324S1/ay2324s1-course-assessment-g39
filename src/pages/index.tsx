import Head from "next/head";
import { PeerPrepCircularLogo } from "~/assets/logo";
import { PageLayout } from "~/components/Layout";

export default function Home() {
  return (
    <>
      <Head>
        <title>PeerPrep</title>
        <meta name="description" content="Supercharge your interview prep" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <PageLayout>
          <div className="bg-slate-900 flex flex-col items-center justify-center h-screen">
            <div className="p-4 w-4/6">
              <PeerPrepCircularLogo
                // height={400}
                // width={400}
                borderColor="white"
              />
            </div>
            {/* <PeerPrepRectLogo height={300} width={300} borderColor="white" /> */}
            <div className="text-center p-2 px-6 w-5/6">
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
                quae ab illo inventore veritatis et quasi architecto beatae
                vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia
              </p>
            </div>
          </div>
        </PageLayout>
      </main>
    </>
  );
}
