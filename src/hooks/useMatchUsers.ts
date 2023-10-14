import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { api } from "~/utils/api";


type UseMatchUsersResult = {
    setMatchedUsers: (user1: string, user2: string) => void;
    matchedString: string;
    matched: boolean;
};
/**
 * Hook for matching users
 * @returns 
 */
export default function useMatchUsers(): UseMatchUsersResult {
    const [matchedString, setMatchedString] = useState("");
    const matchedUsers = api.sharedSession.createSharedCodeSession.useMutation({
        onSuccess(data) {
            if (!data.sessionId) return;
            setMatchedString(data.sessionId);
        }
    });
    function setMatchedUsers(user1: string, user2: string) {
        matchedUsers.mutate({ user1, user2 });
    }
    const router = useRouter();
    useEffect(() => {
        if (matchedString !== "") {
            void router.push(`/collab/rooms/${matchedString}`);
        }
    }, [matchedString])

    return {
        matched: matchedString !== "",
        matchedString,
        setMatchedUsers
    }

}
