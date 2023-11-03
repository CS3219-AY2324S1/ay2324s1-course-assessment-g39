/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { useState } from "react";
import { type UserAndUserMessage } from "~/server/api/routers/userAndUserComm";
import { api } from "~/utils/api";

export type SessionCommResult = [
  UserAndUserMessage[],
  () => void,
  (value: string) => void,
  currentMessage: string,
  partnerTypingMessage: string,
];

export default function useSessionComm(
  sessionId: string,
  userId: string,
  userName: string,
): SessionCommResult {
  const [chatState, setChatState] = useState({
    currentMessage: "",
    partnerName: "",
    partnerIsTyping: false,
  });

  const utils = api.useContext();

  const allSessionMessages =
    api.userAndUserMessages.getAllSessionUserAndUserMessages.useQuery({
      sessionId,
    }).data;

  const addMessageMutation =
    api.userAndUserMessages.addUserAndUserMessage.useMutation();

  api.userAndUserMessages.subscribeToSessionUserAndUserMessages.useSubscription(
    { sessionId, userId },
    {
      onData: (data: UserAndUserMessage) => {
        if (data.message) {
          if (data.userId !== userId)
            setChatState((state) => ({
              ...state,
              partnerName: data.userName,
              partnerIsTyping: data.isTyping,
            }));

          if (allSessionMessages)
            allSessionMessages?.push({
              ...data,
              id: data.id!,
              message: data.message,
              createdAt: data.createdAt!,
            });
        } else {
          setChatState((state) => ({
            ...state,
            partnerName: data.userName,
            partnerIsTyping: data.isTyping,
          }));
        }
      },
      onError(err) {
        console.log("Subscription error: ", err);
        void Promise.resolve(utils.userAndUserMessages.invalidate());
      },
    },
  );

  const addWhoIsTypingMutation =
    api.userAndUserMessages.addWhoIsTyping.useMutation();

  const sendMessage = () => {
    // Don't send empty messages, or messages with only whitespace. Could change this later
    if (chatState.currentMessage.trim().length === 0) return;

    addMessageMutation.mutate({
      sessionId,
      userId,
      userName,
      message: chatState.currentMessage,
    });
    setChatState((state) => ({
      ...state,
      currentMessage: "",
    }));
  };

  const onTyping = (value: string) => {
    addWhoIsTypingMutation.mutate({
      sessionId,
      userId,
      userName,
      isTyping: value.length > 0,
    });
    setChatState((prev) => {
      return {
        ...prev,
        currentMessage: value,
      };
    });
  };

  const userTypingMessage = chatState.partnerIsTyping
    ? chatState.partnerName + " is typing..."
    : "";

  return [
    allSessionMessages as UserAndUserMessage[],
    sendMessage,
    onTyping,
    chatState.currentMessage,
    userTypingMessage,
  ];
}
