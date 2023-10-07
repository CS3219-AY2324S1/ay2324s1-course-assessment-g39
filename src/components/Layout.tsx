import { type PropsWithChildren } from "react";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="flex h-100 justify-center bg-black text-slate-100 overflow-auto">
      <div className="h-full w-full border-x md:max-w-2xl">
        {props.children}
      </div>
    </main>
  );
};
