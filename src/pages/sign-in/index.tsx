import { signIn, getProviders, useSession, signOut } from "next-auth/react";
import Head from "next/head";
import { PageLayout } from "~/components/Layout";
import {
  type GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { PeerPrepRectLogo } from "~/assets/logo";
import LoginWithCredentials from "~/components/Login";
import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";
import { LoadingPage } from "~/components/Loading";

// Signin page with credentials & oauth provider sign in
type SignInProps = InferGetServerSidePropsType<typeof getServerSideProps>;
const SignIn = ({ providers }: SignInProps) => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const onError = (e: Error) => {
    toast.error(`Failed to sign in: \n${e.message}`);
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>SignIn</title>
        </Head>
        <PageLayout>
          <LoadingPage />
        </PageLayout>
      </>
    );
  }
  if (session && session.user) {
    return (
      <>
        <Head>
          <title>SignIn</title>
        </Head>
        <PageLayout>
          <div className="w-full h-full flex flex-col justify-center items-center">
            <div>Logged in as: {session.user.email}</div>
            <div>
              To access the SignIn page,{" "}
              <button
                className="px-1 text-neutral-400 rounded-md underline"
                onClick={() => void signOut({ callbackUrl: "/sign-in" })}
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
        <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
          <div className="flex flex-col w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
            <div className="py-3"></div>
            <PeerPrepRectLogo height={200} />
            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
              <div className="rounded-md">
                {providers &&
                  Object.values(providers)
                    .filter((provider) => provider.id != "credentials")
                    .map((provider) => {
                      return (
                        <div key={provider.name} style={{ marginBottom: 0 }}>
                          <button
                            className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                            onClick={() =>
                              void signIn(provider.id, { callbackUrl: "/" })
                            }
                          >
                            Sign in with {provider.name}
                          </button>
                        </div>
                      );
                    })}
              </div>
              <div className="py-4"></div>
              <LoginWithCredentials
                onError={onError}
                setIsLoading={setIsLoading}
              />
              <div className="pt-4" />
              <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                Don&quot;t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const providers = await getProviders();
  return {
    props: {
      providers,
    },
  };
}

export default SignIn;
