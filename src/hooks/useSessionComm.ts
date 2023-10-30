import { useState } from "react";
import { type Message } from "~/server/api/routers/communication";
import { api } from "~/utils/api";

export type SessionCommResult = [
  Message[],
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

  const allSessionMessages = api.messages.getAllSessionMessages.useQuery({
    sessionId,
  }).data;

  const addMessageMutation = api.messages.addMessage.useMutation();

  api.messages.subscribeToSessionMessages.useSubscription(
    { sessionId, userId },
    {
      onData: (data: Message) => {
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
        void Promise.resolve(utils.messages.invalidate());
      },
    },
  );

  const addWhoIsTypingMutation = api.messages.addWhoIsTyping.useMutation();

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
    allSessionMessages as Message[],
    sendMessage,
    onTyping,
    chatState.currentMessage,
    userTypingMessage,
  ];
}