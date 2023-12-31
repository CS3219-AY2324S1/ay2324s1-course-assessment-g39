// dummy signup page -- ripped straight from https://flowbite.com/blocks/marketing/register/
// todo: change to something reasonable / add a header or smth
// unify style with login page
// input validation

import type { FormEvent } from "react";
import { api } from "~/utils/api";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import Head from "next/head";
import { PageLayout } from "~/components/Layout";
import { PeerPrepRectLogo } from "~/assets/logo";

const SignUp = () => {
  const { data: session } = useSession();

  const createMutation = api.user.create.useMutation({
    onError: (e) => {
      // follow convention to provide generic error message
      // to prevent malicious actors to derive db data (eg. email exists)
      toast.error("Failed to create account\n Please try again later");
    },
    onSuccess: () => {
      const DURATION_TO_LOAD = 1200;
      toast.success("Sign up successful, redirecting...", {
        duration: DURATION_TO_LOAD,
      });
      setTimeout(
        () => void signIn(undefined, { callbackUrl: "/" }),
        DURATION_TO_LOAD,
      );
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const data = new FormData(form);
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    const confirmPassword = data.get("confirm-password") as string;
    const role = data.get("role") as "USER" | "MAINTAINER";
    if (confirmPassword != password) {
      toast.error("Passwords do not match");
      return null;
    }
    const name = data.get("name") as string;
    createMutation.mutate({
      name,
      email,
      password,
      image: null,
      role,
    });
  }

  if (session && session.user)
    return (
      <>
        <Head>
          <title>SignUp</title>
        </Head>
        <PageLayout>
          <div className="w-full h-full flex flex-col justify-center items-center">
            <div>Logged in as: {session.user.email}</div>
            <div>
              To access the SignUp page,{" "}
              <button
                className="px-1 text-neutral-400 rounded-md underline"
                onClick={() => void signOut({ callbackUrl: "/sign-up" })}
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
        <div className="flex flex-col items-center justify-center px-6 py-8 my-8 mx-auto md:h-screen lg:py-0">
          <div className="flex flex-col w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
            <div className="py-3"></div>
            <PeerPrepRectLogo height={200} />
            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                Create an account
              </h1>
              <form
                className="space-y-4 md:space-y-6"
                action="#"
                onSubmit={handleSubmit}
              >
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    placeholder="name"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Your email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    placeholder="••••••••"
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    name="confirm-password"
                    id="confirm-password"
                    placeholder="••••••••"
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <span className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    Select your role from the options below.
                  </span>
                  <select
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    name="role"
                  >
                    <option value="USER">User</option>
                    <option value="MAINTAINER">Maintainer</option>
                  </select>
                </div>
                <div className="py-3"></div>

                <button
                  type="submit"
                  className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                >
                  Create an account
                </button>
                <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                  Already have an account?{" "}
                  <a
                    onClick={() => void signIn(undefined, { callbackUrl: "/" })}
                    className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                  >
                    Login here
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default SignUp;
