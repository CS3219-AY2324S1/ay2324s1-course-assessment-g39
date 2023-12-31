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
import { signOut, useSession } from "next-auth/react";
import { LoadingPage } from "~/components/Loading";
import UpdatePasswordModal from "~/components/UpdatePasswordOverlayModal";
import ConfirmModal from "~/components/ConfirmModal";

// TODO:
// - add email verification
// - change password using email link
// - edit imageURL

const id_z = z.string().min(1);
const name_z = z.string().min(1);
const email_z = z.string().email().min(1);
const emailVerified_z = z.date().nullable();
const image_z = z.string().nullable();
const password_z = z.string().min(6);

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // session is `null` until nextauth fetches user's session data
  const { data: session, update: updateSession } = useSession({
    required: true,
    onUnauthenticated() {
      void router.push("/sign-in");
    },
  });

  const updateInfoSchema = z.object({
    name: name_z,
    email: email_z,
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
      setIsEditingUser(false);

      if (!newUserData) throw new Error("newUserData is undefined");
      const { name, email, image } = newUserData;
      const newUserDataForSession = { name, email, image };

      setIsEditingUser(false);
      void updateSession(newUserDataForSession);
    },
    onError: (e) => {
      toast.error(`Failed to update user`);
      // const zodErrMsg = e.data?.zodError?.fieldErrors.content;
      // reference zodErrMsg?.[0] for zod errors and e.message for generic errors
    },
  });

  const { mutate: updatePassword, isLoading: isUpdatingPassword } =
    api.user.updatePassword.useMutation({
      onSuccess: () => {
        setIsEditingUser(false);
        setIsEditingPassword(false);
        toast.success(`Password updated`);
      },
      onError: (e) => {
        toast.error(`Failed to update password`);
        // const zodErrMsg = e.data?.zodError?.fieldErrors.content;
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
        <UpdatePasswordModal
          showModal={isEditingPassword}
          closeModal={() => setIsEditingPassword(false)}
          onUpdate={(data) =>
            updatePassword({ id: userData.id, password: data.password })
          }
        />
        <ConfirmModal
          title="Delete Account?"
          isOpen={isDeletingAccount}
          message="Are you sure you want to delete your account. If you delete your account you will permanently lose your account information and question submissions history."
          onCancel={() => setIsDeletingAccount(false)}
          onConfirm={() => deleteUser({ id: userData.id })}
          type="warning"
        />
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
        </div>
        <div className="p-4">
          <div className="text-2xl font-bold">{name}</div>
          <div className="">{email}</div>
          {session.user.role == "MAINTAINER" && (
            <span className="font-thin">(Maintainer)</span>
          )}
        </div>
        <div className="py-2" />
        <div className="border-b border-slate-100"></div>
        <div className="p-4 w-1/2">
          <div className="font-bold pb-2">
            <span className="pr-3">Account information</span>
            {isEditingUser ? (
              <button
                className="font-medium text-primary-600 hover:underline dark:text-primary-500"
                onClick={() => setIsEditingUser(false)}
              >
                cancel
              </button>
            ) : (
              <button
                onClick={() => setIsEditingUser(true)}
                className="font-medium text-primary-600 hover:underline dark:text-primary-500"
              >
                edit
              </button>
            )}
          </div>
          <div className="py-2" />
          {isEditingUser && (
            <>
              <form
                className="flex flex-col items-stretch space-y-4 md:space-y-6"
                onSubmit={(e) => void onUpdate(e)}
              >
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-slate-200">
                    Name
                  </label>
                  <input
                    className=" border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-transparent dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    type="text"
                    defaultValue={name}
                    {...register("name")}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-slate-200">
                    Email
                  </label>
                  <input
                    className=" border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 bg-transparent dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    type="email"
                    defaultValue={email}
                    {...register("email")}
                  />
                </div>
                <input
                  className="w-full uppercase text-slate-200 bg-slate-700 hover:bg-slate-900 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-slate-500 dark:hover:bg-slate-600 dark:focus:ring-primary-800"
                  type="submit"
                  value="Save Changes"
                  disabled={isSavingUserData}
                />
                <div className="p-4" />
              </form>
              <div>
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="text-neutral-400 rounded-md underline pr-2"
                >
                  change password
                </button>
              </div>
              <div>
                <button
                  className="text-neutral-400 rounded-md underline"
                  onClick={() => setIsDeletingAccount(true)}
                >
                  delete account
                </button>
              </div>
            </>
          )}
        </div>
        <div className="border-b border-slate-100"></div>
        <div className="p-4">
          <div className="font-bold pb-2">
            <button
              className="font-medium text-slate-300 hover:underline dark:text-slate-400"
              onClick={() => void router.push("/submissions")}
            >
              View all submissions
            </button>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default ProfilePage;
