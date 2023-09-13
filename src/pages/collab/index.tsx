import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { api } from "~/utils/api";

import LoadingIcon from "../../components/collab/LoadingIcon";

const MatchRequestPage = () => {
  const [difficulty, setDifficulty] = useState(-1);
  const [category, setCategory] = useState("");
  const [id, setID] = useState("");
  const [response, setResponse] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    "Searching for partner...",
  );
  const [isWaiting, setIsWaiting] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const [hasSetDifficulty, setHasSetDifficulty] = useState(false);
  const [hasSetCategory, setHasSetCategory] = useState(false);
  const [isDifficultyMissing, setIsDifficultyMissing] = useState(true);
  const [isCategoryMissing, setIsCategoryMissing] = useState(true);
  const difficultyMissingMessage = "Please select a difficulty";
  const categoryMissingMessage = "Please enter a category";

  const [isTimerActive, setIsTimerActive] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const timer = useRef<NodeJS.Timer | null>(null);

  const addRequestMutation = api.matchUsers.sendRequest.useMutation({
    onSuccess: (data) => {
      setResponse(data.msg);
      console.log(response);

      if (data.isSuccess) {
        setStatusMessage("Found a match!");
        setRequestFailed(false);
      } else {
        setStatusMessage("Timeout. No match found.");
        setRequestFailed(true);
      }

      clearInterval(timer.current!);
      setIsTimerActive(false);
      setWaitingTime(0);
      timer.current = null;
    },
  });

  const cancelRequestMutation = api.matchUsers.cancelRequest.useMutation({
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const addRequest = () => {
    if (isDifficultyMissing || isCategoryMissing) {
      if (!hasSetDifficulty) setHasSetDifficulty(true);
      if (!hasSetCategory) setHasSetCategory(true);
      return;
    }

    setIsWaiting(true);
    setIsTimerActive(true);
    setStatusMessage("Searching for partner...");
    // Placeholder for user id
    const randomId = window.crypto.getRandomValues(new Uint32Array(16))[0];
    setID(
      randomId ? randomId.toString() : window.crypto.randomUUID().toString(),
    );
    addRequestMutation.mutate({
      difficulty: difficulty,
      category: category,
      id: randomId?.toString() ?? window.crypto.randomUUID().toString(),
    });
  };

  const cancelRequest = () => {
    cancelRequestMutation.mutate({
      difficulty: difficulty,
      category: category,
      id,
    });
    clearInterval(timer.current!);
    setIsTimerActive(false);
    setWaitingTime(0);
    timer.current = null;
    setIsWaiting(false);
  };

  useEffect(() => {
    if (isTimerActive && !timer.current) {
      timer.current = setInterval(() => {
        setWaitingTime((prev) => prev + 1);
      }, 1000);
    }
  });

  const onDifficultySelect = () => {
    const difficultyDropdownMenu = document.querySelector(
      ".difficulty-menu .dropdown-menu",
    );

    if (!difficultyDropdownMenu?.classList.contains("active")) {
      difficultyDropdownMenu?.classList.add("active");
    } else {
      difficultyDropdownMenu.classList.remove("active");
    }
  };

  const selectDifficulty = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
  ) => {
    event.preventDefault();

    if (!hasSetDifficulty) setHasSetDifficulty(true);

    const value = event.currentTarget.getAttribute("value");

    setDifficulty(parseInt(value!));

    if (isDifficultyMissing) {
      setIsDifficultyMissing(false);
    }

    const displayedDifficulty = document.querySelector(
      ".difficulty-menu .select",
    );
    if (displayedDifficulty)
      displayedDifficulty.innerHTML = event.currentTarget.innerHTML;
  };

  const onCategoryChange = (value: string) => {
    if (!hasSetCategory) setHasSetCategory(true);
    setCategory(value);
    setIsCategoryMissing(value ? false : true);
  };

  // TODO: join session
  const joinSession = () => {
    console.log("join session");
  };

  return (
    <div className="min-h-screen bg-[#2f2f2f] text-center">
      {isWaiting && (
        <div className="queue-status-bar absolute left-1/2 w-80 -translate-x-1/2 justify-self-center bg-black text-white">
          {isTimerActive && <LoadingIcon />}
          <span>{statusMessage}</span>
          {isTimerActive && (
            <button onClick={cancelRequest} className="h-6 w-6 rounded-full">
              <FontAwesomeIcon
                icon={faXmark}
                size="lg"
                style={{ color: "#ff0000" }}
              />
            </button>
          )}
          {!isTimerActive && requestFailed && (
            <button
              onClick={addRequest}
              className="h-6 w-12 rounded-full bg-gray-500 text-white"
            >
              Retry
            </button>
          )}
          {!isTimerActive && !requestFailed && (
            <button
              onClick={joinSession}
              className="h-6 w-24 rounded-md bg-green-500 text-white"
            >
              Join Room
            </button>
          )}
        </div>
      )}
      {isTimerActive && (
        <div className="absolute left-1/2 top-9 w-1/6  -translate-x-1/2 justify-self-center bg-black text-white">
          Time elapsed: {waitingTime} seconds
        </div>
      )}
      <div className="absolute left-1/2 top-1/2 flex h-80 w-64 -translate-x-1/2 -translate-y-1/2 flex-col justify-evenly rounded-xl border p-5">
        <div className="difficulty-menu">
          <span className="choose">Choose Difficulty</span>

          <div className="dropdown" onClick={onDifficultySelect}>
            <div className="select text-center">
              <span>Select Difficulty</span>
            </div>
            <ul className="dropdown-menu">
              <li value={0} onClick={(event) => selectDifficulty(event)}>
                Very Easy
              </li>
              <li value={1} onClick={(event) => selectDifficulty(event)}>
                Easy
              </li>
              <li value={2} onClick={(event) => selectDifficulty(event)}>
                Medium
              </li>
              <li value={3} onClick={(event) => selectDifficulty(event)}>
                Hard
              </li>
              <li value={4} onClick={(event) => selectDifficulty(event)}>
                Very Hard
              </li>
              <li value={5} onClick={(event) => selectDifficulty(event)}>
                Insane
              </li>
            </ul>
          </div>

          {hasSetDifficulty && isDifficultyMissing && (
            <span className="text-xs text-red-500">
              {difficultyMissingMessage}
            </span>
          )}
        </div>
        <div className="category-selection">
          <span className="choose">Enter Category</span>
          <input
            className="w-full rounded-md p-2 text-center focus:outline-none"
            type="text"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
          />
          {hasSetCategory && isCategoryMissing && (
            <span className="text-xs text-red-500">
              {categoryMissingMessage}
            </span>
          )}
        </div>
        <button
          className={`mt-5 rounded-md ${
            isTimerActive ? "bg-purple-800" : "bg-purple-500"
          } p-2 text-lg text-white`}
          type="button"
          onClick={addRequest}
          disabled={isTimerActive}
        >
          Find practice partner
        </button>
      </div>
    </div>
  );
};

export default MatchRequestPage;
