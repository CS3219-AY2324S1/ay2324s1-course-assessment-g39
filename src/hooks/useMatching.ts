

import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const matchingURL = "http://localhost:3005";

// the json object that is sent through the queue
type MatchingMessage = {
    requestId?: string,
    matchedId?: string | undefined,
    joinRequestId?: number | undefined,
    requestingUser?: string,
    matchedUser?: string | undefined,
    matchType: "AUTO" | "MANUAL" | "REQUEST" | "AUTO_MATCHED" | "DELETE_REQUEST" | "DELETE_JOIN_REQUEST"
  }

type MatchingResult = {
    addRequest: (matchType: "AUTO" | "MANUAL", difficulty: number, category: string) => void,
    addJoinRequest: (id: string) => void,
    deleteJoinRequest: (id: number) => void,
    joinRequests: { id: number, name: string }[],
    matchRequests: { id: string, name: string }[],
};

async function fetchRoute<Data>(route: string, data: Data | undefined, method: "GET" | "POST" | "DELETE") {
    return await fetch(`${matchingURL}/${route}`, {
        method,
        credentials: 'include',
        body: data ? JSON.stringify(data) : undefined
    })
}

export default function useMatching(onData: (data: MatchingMessage) => void): MatchingResult {
    const { data: session } = useSession();
    const [requestId, setRequestId] = useState<string | undefined>(undefined);
    // should only be closed on reroute
    const router = useRouter();
    const [connection, setConnection] = useState(true);
    router.events.on('routeChangeStart', () => setConnection(false));
    async function subscribe() {
        while (connection) {
            const fetched = await fetch(`${matchingURL}/match/events`, {
                credentials: "include"
            })  
            const body = fetched.body;
            const reader = body?.getReader();
            while (reader?.closed !== undefined && connection) {
                const data = await reader.read();
                const decoder = new TextDecoder();
                if (!data.value) continue;
                const actualData = decoder.decode(data.value);
                const payload = actualData.split("\n");
                payload.forEach((data) => {
                    if (!data) return;
                    onData(JSON.parse(data) as MatchingMessage);
                });
            }
        }
    }
    useEffect(() => {
       void subscribe();
    }, []);
    return {
        addRequest(matchType, difficulty, category) {
            void fetchRoute('match/create', {
                id: session?.user.id,
                name: session?.user.name,
                matchType,
                difficulty,
                category
            }, "POST").then((res) => res)
            .catch((e) => {
                toast.error("Failed to add request");
            }).then(async (data) => {
                if (data) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const val = await data.json();
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    setRequestId(val.requestId as string);
                }
            });
        },
        addJoinRequest(id) {
            void fetchRoute('match/join', {
                requestId: id, // id of the request we are joining
                userId: session?.user.id,
                userName: session?.user.name,
            }, 'POST');
        },
        deleteJoinRequest(id) {
            void fetchRoute('match/join', {
                id,
            }, "DELETE");
        }

    }
}
