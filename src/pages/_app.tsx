import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type AppType } from "next/app";

import { api } from "~/utils/api";

import "~/styles/globals.sass";
import { Toaster } from "react-hot-toast";
import NavBar from "~/components/NavBar";
import WarningModal from "~/components/WarningModal";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const { data: isDBConnected, isLoading: isDBConnecting } =
    api.general.isDBConnected.useQuery();
  return (
    <SessionProvider session={session}>
      <NavBar />
      <Component {...pageProps} />
      <Toaster position="bottom-center" />
      <WarningModal
        showModal={!isDBConnected && !isDBConnecting}
        msg="Not connected to db, please try again later"
      />
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
