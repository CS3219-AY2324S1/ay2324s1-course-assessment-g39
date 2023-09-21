import { NextPage } from "next";
import Head from "next/head";
import { LoadingPage } from "~/components/Loading";
import { api } from "~/utils/api";

const ProfilePage: NextPage<{ username?: string }> = ({ username }) => {
  username = "sam";
  if (!username) return <div>404</div>;
  const { data, isLoading } = api.user.getByUsername.useQuery({ username });

  console.log("username: ", username);
  if (isLoading) return <LoadingPage />;
  if (!data) return <div>no such user</div>;
  return (
    <>
      <Head>
        <title>Profile</title>
      </Head>
      <main className="flex h-screen justify-center bg-black text-slate-100">
        <div className="overscroll-y-scroll h-full w-full border-x md:max-w-2xl">
          <div>Profile page for {username}</div>
        </div>
      </main>
    </>
  );
};

export default ProfilePage;
