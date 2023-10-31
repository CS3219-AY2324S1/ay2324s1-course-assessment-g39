/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState } from "react";
import type { UserAndAIMessage } from "~/server/api/routers/userAndAIComm";
import { api } from "~/utils/api";

export type AICommResult = [
  UserAndAIMessage[],
  () => void,
  (value: string) => void,
  currentMessage: string,
  isAIResponding: boolean,
];

export default function useAIComm(
  sessionId: string,
  userId: string,
): AICommResult {
  const [chatState, setChatState] = useState({
    currentMessage: "",
    isAIResponding: false,
  });

  const utils = api.useContext();

  const allSessionMessages =
    api.userAndAIMessages.getAllSessionUserAndAIMessages.useQuery({
      sessionId,
      userId,
    }).data;

  const addMessageMutation =
    api.userAndAIMessages.addUserAndAIMessage.useMutation();

  api.userAndAIMessages.subscribeToSessionUserAndAIMessages.useSubscription(
    { sessionId, userId },
    {
      onData: (data: UserAndAIMessage) => {
        if (allSessionMessages)
          allSessionMessages.push({
            ...data,
            id: data.id!,
            message: data.message,
            createdAt: data.createdAt!,
          });

        setChatState((state) => ({
          ...state,
          isAIResponding: false,
        }));
      },
      onError(err) {
        console.log("Subscription error: ", err);
        void Promise.resolve(utils.userAndUserMessages.invalidate());
      },
    },
  );

  const sendMessage = () => {
    // Don't send empty messages, or messages with only whitespace. Could change this later
    if (chatState.currentMessage.trim().length === 0) return;

    allSessionMessages?.push({
      id: "",
      sessionId,
      userId,
      message: chatState.currentMessage,
      role: "user",
      createdAt: new Date(),
    });

    addMessageMutation.mutate({
      sessionId,
      userId,
      message: chatState.currentMessage,
    });

    setChatState((state) => ({
      ...state,
      currentMessage: "",
      isAIResponding: true,
    }));
  };

  const onTyping = (value: string) => {
    setChatState((prev) => {
      return {
        ...prev,
        currentMessage: value,
      };
    });
  };

  return [
    allSessionMessages as UserAndAIMessage[],
    sendMessage,
    onTyping,
    chatState.currentMessage,
    chatState.isAIResponding,
  ];
}
