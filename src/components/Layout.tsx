import { type PropsWithChildren } from "react";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="flex h-screen justify-center bg-slate-900 text-slate-100 overflow-auto">
      <div className="h-full w-full md:max-w-2xl">
        {props.children}
      </div>
    </main>
  );
};
