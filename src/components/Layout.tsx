import { type PropsWithChildren } from "react";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="flex h-screen justify-center">
      <div className="overscroll-y-scroll h-full w-full border-x md:max-w-2xl">
        {props.children}
      </div>
    </main>
  );
};
