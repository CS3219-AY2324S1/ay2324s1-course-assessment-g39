import Head from "next/head";
import Link from "next/link";

export default function Home() {
    return (
        <>
            <Head>
                <title>PeerPrep</title>
                <meta name="description" content="Supercharge your interview prep" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className=" flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[var(--bg-1)] to-[var(--bg-2)]">
                <div className="container flex flex-col items-center justify-center px-12 py-28 max-w-screen-xl">
                    <Link href="/questions" className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2">
                        Go to Questions
                    </Link>
                    <Link href="/signup" className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2">
                        Go to Signup
                    </Link>
                </div>
            </main >
        </>
    );
}
