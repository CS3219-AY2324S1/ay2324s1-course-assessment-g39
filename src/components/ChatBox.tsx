import useSessionComm from "~/hooks/useSessionComm";

const Chatbox = ({
  sessionId,
  userId,
  userName,
  className,
}: {
  sessionId: string;
  userId: string;
  userName: string;
  className?: string | undefined;
}) => {
  const [
    allSessionMessages,
    sendMessage,
    onTyping,
    currentMessage,
    userTypingMessage,
  ] = useSessionComm(sessionId, userId, userName);

  return (
    <div className={className}>
      <div className="messages-container overflow-y-auto flex flex-col h-5/6">
        {allSessionMessages?.map((message) => {
          return (
            <div
              key={message.id}
              className={`w-3/4 rounded-md ${
                message.userId === userId
                  ? "dark:bg-blue-900 ml-auto"
                  : "dark:bg-gray-700"
              } text-white p-2 my-2`}
            >
              <div className="flex justify-between">
                <span>{message.userName}</span>
                <span>Sent at {message.createdAt?.toLocaleTimeString()}</span>
              </div>
              <p className="w-[27.875rem] whitespace-normal break-words">
                {message.message}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col mt-2">
        <p className="text-white mb-2">{userTypingMessage}</p>
        <div className="flex">
          <input
            className="w-full rounded-md p-2 focus:ring-primary-600 focus:border-primary-600"
            type="text"
            value={currentMessage}
            onChange={(e) => onTyping(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
