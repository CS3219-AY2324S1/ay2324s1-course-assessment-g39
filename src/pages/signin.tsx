import {
  signIn,
  getCsrfToken,
  getProviders,
  useSession,
  signOut,
} from "next-auth/react";
import Head from "next/head";
import { PageLayout } from "~/components/Layout";
import {
  type GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { PeerPrepRectLogo } from "~/assets/logo";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const id_z = z.string().min(1); // can add error message
const name_z = z.string().min(1);
const email_z = z.string().email().min(1);
const emailVerified_z = z.date().nullable();
const image_z = z.string().nullable();
const password_z = z.string().min(6);

type SignInProps = InferGetServerSidePropsType<typeof getServerSideProps>;
// const Signin = ({ csrfToken, providers }: SignInProps) => {
const Signin = ({ providers }: SignInProps) => {
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  const createUserInput_z = z.object({
    email: email_z,
    password: password_z,
  });

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(createUserInput_z),
  });

  const handleSignIn = handleSubmit(async (formData) => {
    console.log("formData", formData);
    const res = await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });

    console.log(res);
  });

  if (isLoggedIn) {
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
  }

  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <PageLayout>
        <div className="">
          <PeerPrepRectLogo height={200} />
          {/* <form method="post" action="/api/auth/callback/credentials" className="flex flex-col items-start"> */}
          <form className="flex flex-col items-start" onSubmit={handleSignIn}>
            {/* <input name="csrfToken" type="hidden" defaultValue={csrfToken} /> */}
            <div className="p-1" />
            <label>email:</label>
            <input
              className="text-slate-800 rounded-md"
              type="email"
              {...register("email")}
            />
            <label>password:</label>
            <input
              className="text-slate-800 rounded-md"
              type="password"
              {...register("password")}
            />
            <hr />
            <div className="p-2"></div>
            <input
              className="rounded-md bg-green-500 px-1"
              type="submit"
              value="sign in"
            />
            <div className="p-4" />
          </form>
          <div>
            <hr />
            {providers &&
              Object.values(providers)
                .filter((provider) => provider.id != "credentials")
                .map((provider) => {
                  return (
                    <div key={provider.name} style={{ marginBottom: 0 }}>
                      <button onClick={() => signIn(provider.id)}>
                        Sign in with {provider.name}
                      </button>
                    </div>
                  );
                })}
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
  return {
    props: {
      providers,
    },
  };
}
