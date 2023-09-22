// components/layouts/protectedLayouts.tsx

import type { NextComponentType, NextPageContext } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import UserDenied from "~/components/UserDenied";

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
  const { status: sessionStatus } = useSession();
  const authorized = sessionStatus === "authenticated";
  const unAuthorized = sessionStatus === "unauthenticated";
  const loading = sessionStatus === "loading";

  useEffect(() => {
    // check if the session is loading or the router is not ready
    if (loading || !router.isReady) return;

    // if the user is not authorized, redirect to the login page
    // with a return url to the current page
    // if (unAuthorized) {
    //   console.log("not authorized");
    //   router.push({
    //     pathname: "/",
    //     query: { returnUrl: router.asPath },
    //   });
    // }
  }, [loading, unAuthorized, sessionStatus, router]);

  // if the user refreshed the page or somehow navigated to the protected page
  if (loading) {
    return <>Loading app...</>;
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
