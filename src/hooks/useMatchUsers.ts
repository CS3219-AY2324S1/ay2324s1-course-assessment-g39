import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "~/utils/api";

type UseMatchUsersResult = {
  setMatchedUsers: (user1: string, user2: string) => void;
};
/**
 * Hook for matching users
 * @returns a function to set a pair of matched users
 */
export default function useMatchUsers(): UseMatchUsersResult {
  const { data: session } = useSession();
  const matchedUsers = api.sharedSession.createSharedCodeSession.useMutation();

  const router = useRouter();
  const matchUsersSubscription =
    api.sharedSession.sharedCodeSessionSubscription.useSubscription(undefined, {
      onData(data) {
        if (
          data.user1 === session?.user.id ||
          data.user2 === session?.user.id
        ) {
          console.log("Routing");
          toast.success("Redirecting to room...");
          void router.push(`/collab/rooms/${data.sessionId}`);
        }
      },
    });

  return {
    setMatchedUsers(user1, user2) {
      const smallerUser = user1 < user2 ? user1 : user2;
      if (smallerUser === session?.user.id) return; // the larger user does the matching
      matchedUsers.mutate({ user1, user2 });
    },
  };
}
