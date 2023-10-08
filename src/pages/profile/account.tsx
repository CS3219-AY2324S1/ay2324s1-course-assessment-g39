import { type NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/Layout";
import { api } from "~/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, signOut, useSession } from "next-auth/react";
import { LoadingPage } from "~/components/Loading";

// TODO:
// - edit imageURL
// - change password using email link
// - client-side validation using zod
// - add email verification

const ProfilePage: NextPage = () => {
  const [isEditing, setIsEditing] = useState(false);
  // session is `null` until nextauth fetches user's session data
  const { data: session, update: updateSession } = useSession({
    required: true,
    // defaults redirects user to sign in page if not signed in
  });
  const router = useRouter();

  const updateInfoSchema = z.object({
    name: z.string().min(1, { message: "Required" }),
    email: z.string().email(),
  });

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(updateInfoSchema),
  });

  const { mutate: deleteUser } = api.user.deleteUserByID.useMutation({
    retry: 3,
    onSuccess: () => {
      toast.success("User deleted");
      void signOut(); // invalidates user session
    },
    onError: (e) => {
      toast.error(`Failed to delete user: ${e.message}`);
    },
  });

  const {
    mutate: updateUser,
    isLoading: isSavingUserData,
    variables: newUserData,
  } = api.user.update.useMutation({
    onSuccess: () => {
      toast.success(`User updated`);

      if (!newUserData) throw new Error("newUserData is undefined");

      const { name, email, image } = newUserData;
      const newUserDataForSession = { name, email, image };

      setIsEditing(false);
      void updateSession(newUserDataForSession);
    },
    onError: (e) => {
      const errMsg = e.data?.zodError?.fieldErrors.content;
      if (errMsg?.[0]) {
        toast.error(`Failed to post: ${errMsg[0]}`);
      }
    },
  });

  const { mutate: updatePassword, isLoading: isUpdatingPassword } =
    api.user.updatePassword.useMutation({
      onSuccess: () => {
        setIsEditing(false);
        toast.success(`Password updated`);
      },
      onError: (e) => {
        const errMsg = e.data?.zodError?.fieldErrors.content;
        if (errMsg?.[0]) {
          toast.error(`Failed to update password: ${errMsg[0]}`);
        }
      },
    });

  if (!session) {
    return (
      <>
        <Head>
          <title>Profile</title>
        </Head>
        <PageLayout>
          <LoadingPage />
        </PageLayout>
      </>
    );
  }

  // TODO: hacky fix, please have useSession return correctly typed user
  const userData = session.user as {
    name: string;
    email: string;
    id: string;
    image: string | null;
  };

  const { name, image: imageURL, email } = userData;

  const onUpdate = handleSubmit((formData) => {
    const newData = { formData, ...userData };
    if (newData != userData) {
      updateUser({ ...userData, ...formData });
    }
  });

  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <PageLayout>
        <div className="relative h-48 bg-slate-600 border-b overscroll-y-scroll w-full border-x md:max-w-2xl">
          <Image
            src={imageURL ?? "https://picsum.photos/300/300"}
            alt={`${name ?? ""}'s profile pic`}
            width={128}
            height={128}
            className="absolute -mb-[64px] ml-4 rounded-md border-b border-2 bottom-0 left-0 bg-black"
          />
        </div>
        {/* spacer */}
        <div className="h-[64px] relative">
          <div className="absolute m-2 p-2 top-0 right-0">
            <button
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="text-neutral-400 rounded-md underline"
            >
              log out
            </button>
          </div>
        </div>{" "}
        <div className="p-4">
          <div className="text-2xl font-bold">{name}</div>
          {session.user.role == "MAINTAINER" && <em>Maintainer</em>}
          <div className="pb-4">{email}</div>
        </div>
        <div className="border-b border-slate-100"></div>
        <div className="p-4 w-1/2">
          <div className="font-bold pb-2">
            Account information
            {isEditing ? (
              <button
                className="text-blue-400 rounded px-1 m-2"
                onClick={() => setIsEditing(false)}
              >
                cancel
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-400 rounded px-1 m-2"
              >
                edit
              </button>
            )}
          </div>
          {isEditing && (
            <>
              <form className="flex flex-col items-start" onSubmit={(e) => void onUpdate(e)}>
                <label>name:</label>
                <input
                  className="text-slate-800"
                  type="text"
                  defaultValue={name}
                  {...register("name")}
                />
                <div className="p-1" />
                <label>email:</label>
                <input
                  className="text-slate-800"
                  type="email"
                  defaultValue={email}
                  {...register("email")}
                />
                <hr />
                <div className="p-2"></div>
                <input
                  className="rounded-md bg-green-500 px-1"
                  type="submit"
                  value="save"
                  disabled={isSavingUserData}
                />
                <div className="p-4" />
              </form>
              <div>
                {" "}
                <button
                  onClick={() => {
                    const pw = prompt("enter new password");
                    // stopgap measure, need to centralize user field type def
                    const pwVerified = z.string().min(8).safeParse(pw);
                    if (pwVerified.success) {
                      void updatePassword({
                        id: userData.id,
                        password: pwVerified.data,
                      });
                    } else {
                      toast.error("invalid password");
                    }
                  }}
                  className="text-neutral-400 rounded-md underline pr-2"
                >
                  change password
                </button>
              </div>
              <div>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "WARNING! All accout information will be removed on deletion. Are you sure you want to proceed?",
                      )
                    ) {
                      deleteUser({ id: userData.id });
                    }
                  }}
                  className="text-neutral-400 rounded-md underline"
                >
                  delete account
                </button>
              </div>
            </>
          )}
        </div>
      </PageLayout>
    </>
  );
};

export default ProfilePage;
