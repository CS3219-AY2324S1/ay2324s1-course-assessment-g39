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
  });

  const addMessageMutation = api.messages.addMessage.useMutation();

  api.messages.subscribeToSessionMessages.useSubscription(
    { sessionId },
    {
      onData: (_data) => {
        void allSessionMessages.refetch();
        // TODO: Fix autoscroll to bottom
        const messagesContainer = document.getElementById("messages-container");
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      },
      onError(err) {
        console.log("Subscription error: ", err);
        void Promise.resolve(utils.messages.invalidate());
      },
    },
  );

  const addWhoIsTypingMutation = api.messages.addWhoIsTyping.useMutation();

  api.messages.subscribeToWhoIsTyping.useSubscription(
    { sessionId, userId },
    {
      onData: (data: { otherUser: string; isTyping: boolean }) => {
        setChatState((state) => ({
          ...state,
          partnerName: data.otherUser,
          partnerIsTyping: data.isTyping,
        }));
      },
      onError(err) {
        console.log("Subscription error: ", err);
        void Promise.resolve(utils.messages.invalidate());
      },
    },
  );

  const sendMessage = () => {
    // Don't send empty messages, or messages with only whitespace. Could change this later
    if (chatState.currentMessage.trim().length === 0) return;

    addMessageMutation.mutate({
      sessionId,
      senderId: userId,
      senderName: userName,
      message: chatState.currentMessage,
    });
    setChatState((state) => ({
      ...state,
      currentMessage: "",
      partnerIsTyping: false,
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
    allSessionMessages.data as Message[],
    sendMessage,
    onTyping,
    chatState.currentMessage,
    userTypingMessage,
  ];
}
