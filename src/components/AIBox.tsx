import useAIComm from "~/hooks/useAIComm";

const AIBox = ({
  sessionId,
  userId,
  userName,
  className,
}: {
  sessionId: string;
  userId: string;
  userName: string;
  className?: string;
}) => {
  const [
    allSessionMessages,
    sendMessage,
    onTyping,
    currentMessage,
    isAIResponding,
  ] = useAIComm(sessionId, userId);

  return (
    <div className={className}>
      <div className="messages-container overflow-y-auto flex flex-col h-5/6">
        {allSessionMessages?.map((message) => {
          return (
            <div
              key={message.id}
              className={`w-3/4 rounded-md ${
                message.role === "user"
                  ? "dark:bg-gray-900 ml-auto"
                  : "dark:bg-gray-500"
              } text-white p-2 my-2`}
            >
              <div className="flex justify-between">
                <span>{message.role === "user" ? userName : "GPT-3.5"}</span>
              </div>
              <p>{message.message}</p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col mt-2">
        <div className="flex">
          {!isAIResponding && (
            <input
              className="w-full rounded-md p-2 focus:ring-primary-600 focus:border-primary-600"
              type="text"
              value={currentMessage}
              onChange={(e) => onTyping(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
          )}
          {isAIResponding && (
            <input
              className="w-full rounded-md p-2"
              value="GPT-3.5 is responding..."
              disabled
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AIBox;
