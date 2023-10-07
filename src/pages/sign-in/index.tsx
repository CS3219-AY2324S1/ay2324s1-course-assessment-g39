import { signIn, getProviders, useSession, signOut } from "next-auth/react";
import Head from "next/head";
import { PageLayout } from "~/components/Layout";
import {
  type GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { PeerPrepRectLogo } from "~/assets/logo";
import LoginWithCredentials from "~/components/Login";

// Signin page with credentials & oauth provider sign in
type SignInProps = InferGetServerSidePropsType<typeof getServerSideProps>;
const SignIn = ({ providers }: SignInProps) => {
  const { data: session } = useSession();

  if (session && session.user) {
    return (
      <>
        <Head>
          <title>Profile</title>
        </Head>
        <PageLayout>
          <div className="w-full h-full flex flex-col justify-center items-center">
            <div>Logged in as: {session.user.email}</div>
            <div>
              To access the SignIn page,{" "}
              <button
                className="px-1 text-neutral-400 rounded-md underline"
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
              >
                log out
              </button>
            </div>
          </div>
        </PageLayout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <PageLayout>
        <div className="w-full h-full flex flex-col justify-center items-center">
          <div className="flex flex-col items-stretch">
            <PeerPrepRectLogo height={200} />
            <div className="p-2 rounded-md">
              {providers &&
                Object.values(providers)
                  .filter((provider) => provider.id != "credentials")
                  .map((provider) => {
                    return (
                      <div key={provider.name} style={{ marginBottom: 0 }}>
                        <button
                          className="w-full p-2 rounded-md bg-indigo-500 text-white hover:bg-indigo-600"
                          onClick={() =>
                            signIn(provider.id, { callbackUrl: "/" })
                          }
                        >
                          Sign in with {provider.name}
                        </button>
                      </div>
                    );
                  })}
            </div>
            <LoginWithCredentials className="px-2" />
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const providers = await getProviders();
  console.log("providers", providers);
  return {
    props: {
      providers,
    },
  };
}

export default SignIn;
