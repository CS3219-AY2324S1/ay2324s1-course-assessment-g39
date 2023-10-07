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
    console.log("formData", formData);
    const res = await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: true,
      callbackUrl: "/",
    });

    console.log(res);
  });
  return (
    <div className={props.className}>
      <form className="flex flex-col items-stretch" onSubmit={handleSignIn}>
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
        <div className="p-2"></div>
        <input
          className="rounded-md bg-slate-600 px-1"
          type="submit"
          value="sign in"
        />
        <div className="p-4" />
      </form>
    </div>
  );
};

export default LoginWithCredentials;
