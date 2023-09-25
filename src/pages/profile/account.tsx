import { NextPage } from "next";
import Head from "next/head";
import { LoadingPage } from "~/components/Loading";
import { api } from "~/utils/api";
import Image from "next/image";
import { PageLayout } from "~/components/Layout";
import { useForm } from "react-hook-form";
import { useState } from "react";
import toast from "react-hot-toast";

// (U) Profile edit (name, email, imageURL)
// -- change password
//
// (D) Delete profile
// ? View attempts
const ProfilePage: NextPage = () => {
  const [isEditing, setIsEditing] = useState(false);

  const {
    data,
    isLoading,
    refetch: refetchUser,
  } = api.user.getCurrentUser.useQuery();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  if (errors) {
    // console.log("errors", errors);
    // const errorMessages = Object.values(errors).map((error) => error?.message);
    // toast.error(errorMessages.join("\n"));
  }

  const { mutate, isLoading: isSavingUserData } = api.user.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      toast.success(`User updated`);
      refetchUser();
    },
    onError: (e) => {
      const errMsg = e.data?.zodError?.fieldErrors.content;
      if (errMsg && errMsg[0]) {
        toast.error(`Failed to post: ${errMsg[0]}`);
      }
    },
  });

  if (!data) return <div>no such user</div>;
  const { name, image: imageURL, email } = data;

  const onSubmit = handleSubmit((formData) => {
    const newData = { formData, ...data };
    if (newData != data) {
      mutate({ ...data, ...formData });
      console.log("formData", formData);
    }
  });
  if (isLoading) return <LoadingPage />;
  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <PageLayout>
        <div className="relative h-48 bg-slate-600 border-b overscroll-y-scroll w-full border-x md:max-w-2xl">
          <Image
            src={imageURL || "https://picsum.photos/300/300"}
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
              <form className="flex flex-col items-start" onSubmit={onSubmit}>
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
                  {...register("email", {
                    required: "minimum 6 char long",
                    minLength: {
                      value: 6,
                      message: "minimum 6 char long",
                    },
                  })}
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
                <button className="text-neutral-400 rounded-md underline">
                  change password
                </button>
              </form>
            </>
          )}
        </div>
      </PageLayout>
    </>
  );
};

export default ProfilePage;
