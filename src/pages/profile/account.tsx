import { type NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { PageLayout } from "~/components/Layout";
import { LoadingPage } from "~/components/Loading";
import { api } from "~/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// TODO:
// - edit imageURL
// - change password
// - client-side validation using zod

const ProfilePage: NextPage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const {
    data: userData,
    isLoading: isLoadingUserData,
    refetch: refetchUser,
    error: errorFetchingUser,
  } = api.user.getCurrentUser.useQuery();

  const updateInfoSchema = z.object({
    name: z.string().min(1, { message: "Required" }),
    email: z.string().email(),
  });

  const { register, handleSubmit } = useForm({
    resolver: zodResolver(updateInfoSchema),
  });

  const { mutate: deleteUser } = api.user.deleteUserByID.useMutation({
    onSuccess: () => {
      toast.success("Succesfully deleted user");
      void router.push("/");
    },
    onError: (e) => {
      console.log(e);
      toast.error(`Failed to delete user: ${e.message}`);
    },
  });

  const { mutate: updateUser, isLoading: isSavingUserData } =
    api.user.update.useMutation({
      onSuccess: () => {
        setIsEditing(false);
        toast.success(`User updated`);
        void refetchUser();
      },
      onError: (e) => {
        const errMsg = e.data?.zodError?.fieldErrors.content;
        if (errMsg?.[0]) {
          toast.error(`Failed to post: ${errMsg[0]}`);
        }
      },
    });

  if (errorFetchingUser) {
    return (
      <>
        <Head>
          <title>Profile</title>
        </Head>
        <PageLayout>
          <div className="w-full h-full flex flex-col justify-center items-center">
            <div className="align-middle">404 User not found</div>
            <div>
              <button
                className="text-neutral-400 rounded-md underline"
                onClick={() => void router.push("/signup/")}
              >
                Go to Signup
              </button>
            </div>
          </div>
        </PageLayout>
      </>
    );
    // router.push("/signup/");
  }
  if (isLoadingUserData || !userData) return <LoadingPage />;

  const { name, image: imageURL, email } = userData;

  const onUpdate = handleSubmit((formData) => {
    const newData = { formData, ...userData };
    if (newData != userData) {
      updateUser({ ...userData, ...formData });
      console.log("formData", formData);
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
        <div className="h-[64px]"></div>
        <div className="p-4">
          <div className="text-2xl font-bold">{name}</div>
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
              <form className="flex flex-col items-start" onSubmit={onUpdate}>
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
                <button className="text-neutral-400 rounded-md underline pr-2">
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
