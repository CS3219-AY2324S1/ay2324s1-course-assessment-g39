// components/layouts/protectedLayouts.tsx

import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import UserDenied from "~/components/UserDenied";
import { LoadingPage } from "../Loading";
import { PageLayout } from "../Layout";

type Props = {
  children: React.ReactElement;
};

/*
  Wrapper component from https://dev.to/esponges/protecting-routes-with-nextauth-in-nextjs-2kkd
  add the requireAuth property to the page component
  to protect the page from unauthenticated users
  e.g.:
  OrderDetail.requireAuth = true;
  export default OrderDetail;
 */

export const AuthWrapper = ({ children }: Props): JSX.Element => {
  const router = useRouter();
  const { status: sessionStatus } = useSession({ required: true });
  const authorized = sessionStatus === "authenticated";
  // const unAuthorized = sessionStatus === "unauthenticated";
  const loading = sessionStatus === "loading";

  // if the user refreshed the page or somehow navigated to the protected page
  if (loading) {
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
) {
  // eslint-disable-next-line react/display-name
  return (pageProps: Props) => {
    return (
      <AuthWrapper>
        <Component {...pageProps} />
      </AuthWrapper>
    );
  };
}
