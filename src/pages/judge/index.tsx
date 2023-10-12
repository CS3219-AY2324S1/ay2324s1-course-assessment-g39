import { useState, type FormEvent } from "react";

import { toast } from "react-hot-toast";
import { PeerPrepRectLogo } from "~/assets/logo";
import J0Logo from "~/assets/j0_white.png";
import { api } from "~/utils/api";
import Image from "next/image";
// import { useSession } from "next-auth/react";

export default function Questions() {

    const [output, setOutput] = useState<string | null>(null);

    const languages = api.judge.getLanguages.useQuery(undefined, {
        onError: (e) => {
            toast.error("Failed to fetch languages: " + e.message);
        },
    }).data ?? [];

    const run = api.judge.run.useMutation({
        onSuccess: (data) => {
            setOutput(data);
        },
        onError: (e) => {
            toast.error("Failed to run code: " + e.message);
            setOutput(null);
        },
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const data = new FormData(form);
        const language_id = Number(data.get("language") as string);
        const source_code = data.get("source_code") as string;
        run.mutate({ language_id, source_code });
    };

    return (
        <main className=" flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[var(--bg-1)] to-[var(--bg-2)]">
            <div className="container flex flex-col items-center justify-center p-12 max-w-screen-xl">
                <span className="flex row items-center">
                    <PeerPrepRectLogo height={200} width={200} fill="" />
                    <span className="text-5xl mx-4 text-[var(--txt-3)]" >&times;</span>
                    <Image
                        src={J0Logo}
                        alt="J0 Logo"
                        width={250}
                    />
                </span>
                <form
                    className="w-full h-full flex flex-col gap-3 items-start"
                    action="#"
                    onSubmit={handleSubmit}
                >
                    <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        Language
                        <select
                            name="language"
                            id="language"
                            className="mt-3 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                            required
                        >
                            {languages.map((language, i) => (
                                <option key={language.id} value={language.id} selected={i === 0}>
                                    {`[${language.id}] ` + language.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="w-full mb-10 flex-1 block text-sm font-medium text-gray-900 dark:text-white">
                        Code
                        <textarea
                            name="source_code"
                            id="source_code"
                            className="mt-3 h-full min-h-[10rem] w-full p-2 font-mono box-border bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white "
                        />
                    </label>

                    <button
                        type="submit"
                        className=" text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                    >
                        Run
                    </button>

                    {output && (
                        <label className="w-full mb-10 flex-1 block text-sm font-medium text-gray-900 dark:text-white">
                            Output
                            <textarea
                                name="output"
                                id="output"
                                className="mt-3 h-full min-h-[10rem] w-full p-2 font-mono box-border bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white "
                                value={output}
                                readOnly
                            />
                        </label>
                    )}
                </form>
            </div>
        </main >
    );
}
