import { signIn } from "next-auth/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const email_z = z.string().email().min(1);
const password_z = z.string().min(6);

type Props = { className?: string };
const LoginWithCredentials = (props: Props) => {
  const createUserInput_z = z.object({
    email: email_z,
    password: password_z,
  });

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(createUserInput_z),
  });

  const handleSignIn = handleSubmit(async (formData) => {
    const res = await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: true,
      callbackUrl: "/",
    });

  });
  return (
    <div className={props.className}>
      <form
        className="flex flex-col items-stretch space-y-4 md:space-y-6"
        onSubmit={(formData) => void handleSignIn(formData)}
      >
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Email
          </label>
          <input
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            type="email"
            placeholder="name@company.com"
            {...register("email")}
          />
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Password
          </label>
          <input
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            type="password"
            placeholder="••••••••"
            {...register("password")}
          />
        </div>
        <div className="py-1">
          <input
            className="w-full text-white bg-slate-500 hover:bg-slate-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-slate-400 dark:hover:bg-slate-500 dark:focus:ring-primary-800"
            type="submit"
            value="Sign In"
          />
        </div>
        <div />
      </form>
    </div>
  );
};

export default LoginWithCredentials;
