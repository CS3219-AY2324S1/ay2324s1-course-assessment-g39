import Head from "next/head";
import Link from "next/link";
import { PeerPrepCircularLogo } from "~/assets/logo";

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
          <PeerPrepCircularLogo height={300} width={300} fill="black" />
          {/* <PeerPrepRectLogo height={300} width={300} fill="" /> */}
          <Link
            href="/questions"
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2"
          >
            Questions
          </Link>
          <Link
            href="/sign-up"
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2"
          >
            Sign Up
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2"
          >
            Sign In
          </Link>
          <Link
            href="/profile/account"
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2"
          >
            User Profile
          </Link>
          <Link
            href="/collab"
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2"
          >
            Practice with others
          </Link>
          <Link
            href="/codespace"
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2"
          >
            Code spaces
          </Link>
          <Link
            href="/judge"
            className="flex items-center justify-center font-bold text-white no-underline transition hover:bg-white/20 rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2"
          >
            Test Code
          </Link>
        </div>
      </main>
    </>
  );
}
