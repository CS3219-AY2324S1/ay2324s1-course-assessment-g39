import { NextPage } from "next";
import Head from "next/head";
import { LoadingPage } from "~/components/Loading";
import { api } from "~/utils/api";
import Image from "next/image";
import { PageLayout } from "~/components/Layout";

const ProfilePage: NextPage<{ username?: string }> = ({ username }) => {
  username = "sam";
  if (!username) return <div>404</div>;
  const { data, isLoading } = api.user.getByUsername.useQuery({ username });

  console.log("username: ", username);
  if (isLoading) return <LoadingPage />;
  if (!data) return <div>no such user</div>;
  const { id, image: imageURL } = data;

  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <PageLayout>
        <div className="relative h-48 bg-slate-600 border-b overscroll-y-scroll w-full border-x md:max-w-2xl">
          <Image
            src={imageURL || "https://picsum.photos/300/300"}
            alt={`${username ?? ""}'s profile pic`}
            width={128}
            height={128}
            className="absolute -mb-[64px] ml-4 rounded-md border-b border-2 bottom-0 left-0 bg-black"
          />
        </div>
        <div className="h-[64px]"></div>
        <div className="p-4 text-2xl font-bold">@{username}</div>
        <div className="border-b border-slate-100"></div>
      </PageLayout>
    </>
  );
};

export default ProfilePage;
