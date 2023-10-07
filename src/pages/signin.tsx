import {
  signIn,
  getCsrfToken,
  getProviders,
  useSession,
  signOut,
} from "next-auth/react";
import Image from "next/image";
import Head from "next/head";
import { PageLayout } from "~/components/Layout";
import { CtxOrReq } from "next-auth/client/_utils";
import {
  type GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { PeerPrepRectLogo } from "~/assets/logo";
type SignInProps = InferGetServerSidePropsType<typeof getServerSideProps>;
const Signin = ({ csrfToken, providers }: SignInProps) => {
  const { data: session } = useSession();
  const isLoggedIn = !!session;
  if (isLoggedIn)
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
                onClick={() => signOut({ callbackUrl: "/signin" })}
              >
                log out
              </button>
            </div>
          </div>
        </PageLayout>
      </>
    );
  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <PageLayout>
        <div style={{ overflow: "hidden", position: "relative" }}>
          <div className="">
            <div className="">
              <PeerPrepRectLogo height={200} />
              <div className="">
                <input
                  name="csrfToken"
                  type="hidden"
                  defaultValue={csrfToken}
                />
                <input placeholder="Email (Not Setup - Please Use Github)" />
                <button className="">Submit</button>
                <hr />
                {providers &&
                  Object.values(providers).map((provider) => (
                    <div key={provider.name} style={{ marginBottom: 0 }}>
                      <button onClick={() => signIn(provider.id)}>
                        Sign in with {provider.name}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
        </div>
      </PageLayout>
    </>
  );
};

export default Signin;

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const providers = await getProviders();
  const csrfToken = await getCsrfToken(context);
  return {
    props: {
      providers,
      csrfToken,
    },
  };
}
