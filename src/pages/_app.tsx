import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.sass";
import { Toaster } from "react-hot-toast";
import NavBar from "~/components/NavBar";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <NavBar />
      <Component {...pageProps} />
      <Toaster position="bottom-center" />
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
