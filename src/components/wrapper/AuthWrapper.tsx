// components/layouts/protectedLayouts.tsx

import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import UserDenied from "~/components/UserDenied";
import { LoadingPage } from "../Loading";
import { PageLayout } from "../Layout";
import { useEffect } from "react";
import toast from "react-hot-toast";

type Props = {
  children: React.ReactElement;
  maintainerOnly?: boolean;
};

/*
  Wrapper component from https://dev.to/esponges/protecting-routes-with-nextauth-in-nextjs-2kkd
  add the requireAuth property to the page component
  to protect the page from unauthenticated users
  e.g.:
  OrderDetail.requireAuth = true;
  export default OrderDetail;
 */

export const AuthWrapper = ({ children, maintainerOnly }: Props): JSX.Element => {
  const { status: sessionStatus, data: session } = useSession({ required: true });
  const authorized = sessionStatus === "authenticated";
  const isMaintainer = session?.user.role === "MAINTAINER";
  const loading = sessionStatus === "loading";
  const router = useRouter();

  useEffect(() => {
    if (session && maintainerOnly && !isMaintainer) {
      toast.error("Maintainer only route");
      void router.back();
    }
  }, [session]);

  // if the user refreshed the page or somehow navigated to the protected page
  if (loading || maintainerOnly && !isMaintainer) {
    return (
      <>
        <PageLayout>
          <LoadingPage />
        </PageLayout>
      </>
    );
  }

  // if the user is authorized, render the page
  // otherwise, render nothing while the router redirects him to the login page
  return authorized ? <div>{children}</div> : <UserDenied />;
};

export function WithAuthWrapper<Props extends JSX.IntrinsicAttributes>(
  Component: (props: Props) => JSX.Element,
  maintainerOnly = false
) {
  // eslint-disable-next-line react/display-name
  return (pageProps: Props) => {
    return (
      <AuthWrapper maintainerOnly={maintainerOnly}>
        <Component {...pageProps} />
      </AuthWrapper>
    );
  };
}
