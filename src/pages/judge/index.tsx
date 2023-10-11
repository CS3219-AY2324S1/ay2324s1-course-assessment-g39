import { useState } from "react";

import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
// import { useSession } from "next-auth/react";

export default function Questions() {


    return (
        <main className=" flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[var(--bg-1)] to-[var(--bg-2)]">
                <div className="container flex flex-col items-center justify-center px-12 py-28 max-w-screen-xl">
                    <h1 className="text-5xl font-extrabold tracking-tight mb-12 text-[var(--txt-3)] sm:text-[5rem]">
                        Judge<span className="text-[var(--txt-1)]">0</span>
                    </h1>
                </div>
            </main >
    );
}
