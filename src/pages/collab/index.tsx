import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { api } from "~/utils/api";

import LoadingIcon from "~/components/LoadingIcon";

const MatchRequestPage = () => {
  const [pageState, setPageState] = useState({
    difficulty: -1,
    category: "",
    id: "",
    response: "",
    statusMessage: "Searching for partner...",
    isWaiting: false,
    requestFailed: false,
    hasSetDifficulty: false,
    hasSetCategory: false,
    isDifficultyMissing: true,
    isCategoryMissing: true,
    isTimerActive: false,
    waitingTime: 0,
  });

  const timer = useRef<NodeJS.Timer | null>(null);

  const difficultyMissingMessage = "Please select a difficulty";
  const categoryMissingMessage = "Please enter a category";

  const addRequestMutation = api.matchRequest.addRequest.useMutation({
    onSuccess: (data) => {
      setPageState((prev) => ({
        ...prev,
        response: data.msg,
      }));
      console.log(data.msg);

      if (data.isSuccess) {
        setPageState((prev) => ({
          ...prev,
          statusMessage: "Found a match!",
          requestFailed: false,
        }));
      } else {
        setPageState((prev) => ({
          ...prev,
          statusMessage: "Timeout. No match found.",
          requestFailed: true,
        }));
      }

      clearInterval(timer.current!);
      setPageState((prev) => ({
        ...prev,
        isTimerActive: false,
        waitingTime: 0,
      }));
      timer.current = null;
    },
  });

  const cancelRequestMutation = api.matchRequest.cancelRequest.useMutation({
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const addRequest = () => {
    if (pageState.isDifficultyMissing || pageState.isCategoryMissing) {
      if (!pageState.hasSetDifficulty)
        setPageState((prev) => ({ ...prev, hasSetDifficulty: true }));
      if (!pageState.hasSetCategory)
        setPageState((prev) => ({ ...prev, hasSetCategory: true }));
      return;
    }

    setPageState((prev) => ({
      ...prev,
      isWaiting: true,
      isTimerActive: true,
      statusMessage: "Searching for partner...",
    }));

    // Placeholder for user id
    const randomId = window.crypto.getRandomValues(new Uint32Array(16))[0];
    const requestId =
      randomId?.toString() ?? window.crypto.randomUUID().toString();
    setPageState((prev) => ({
      ...prev,
      id: requestId,
    }));
    addRequestMutation.mutate({
      difficulty: pageState.difficulty,
      category: pageState.category,
      id: requestId,
    });
  };

  const cancelRequest = () => {
    cancelRequestMutation.mutate({
      difficulty: pageState.difficulty,
      category: pageState.category,
      id: pageState.id,
    });
    clearInterval(timer.current!);
    setPageState((prev) => ({
      ...prev,
      isTimerActive: false,
      waitingTime: 0,
      isWaiting: false,
    }));
    timer.current = null;
  };

  useEffect(() => {
    if (pageState.isTimerActive && !timer.current) {
      timer.current = setInterval(() => {
        setPageState((prev) => ({
          ...prev,
          waitingTime: prev.waitingTime + 1,
        }));
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

    if (!pageState.hasSetDifficulty)
      setPageState((prev) => ({ ...prev, hasSetDifficulty: true }));

    const value = event.currentTarget.getAttribute("value");

    setPageState((prev) => ({
      ...prev,
      difficulty: parseInt(value!),
    }));

    if (pageState.isDifficultyMissing) {
      setPageState((prev) => ({
        ...prev,
        isDifficultyMissing: false,
      }));
    }

    const displayedDifficulty = document.querySelector(
      ".difficulty-menu .select",
    );
    if (displayedDifficulty)
      displayedDifficulty.innerHTML = event.currentTarget.innerHTML;
  };

  const onCategoryChange = (value: string) => {
    if (!pageState.hasSetCategory)
      setPageState((prev) => ({ ...prev, hasSetCategory: true }));

    setPageState((prev) => ({
      ...prev,
      category: value,
      isCategoryMissing: value ? false : true,
    }));
  };

  // TODO: join session
  const joinSession = () => {
    console.log("join session");
  };

  return (
    <div className="min-h-screen bg-[#2f2f2f] text-center">
      {pageState.isWaiting && (
        <div className="queue-status-bar absolute left-1/2 w-80 -translate-x-1/2 justify-self-center rounded-md bg-black text-white">
          {pageState.isTimerActive && <LoadingIcon />}
          <span>{pageState.statusMessage}</span>
          {pageState.isTimerActive && (
            <button onClick={cancelRequest} className="h-6 w-6 rounded-full">
              <FontAwesomeIcon
                icon={faXmark}
                size="lg"
                style={{ color: "#ff0000" }}
              />
            </button>
          )}
          {!pageState.isTimerActive && pageState.requestFailed && (
            <button
              onClick={addRequest}
              className="h-6 w-12 rounded-full bg-gray-500 text-white"
            >
              Retry
            </button>
          )}
          {!pageState.isTimerActive && !pageState.requestFailed && (
            <button
              onClick={joinSession}
              className="h-6 w-24 rounded-md bg-green-500 text-white"
            >
              Join Room
            </button>
          )}
        </div>
      )}
      {pageState.isTimerActive && (
        <div className="absolute left-1/2 top-9 w-1/6 -translate-x-1/2 justify-self-center rounded-md bg-black py-1 text-white">
          Time elapsed: {pageState.waitingTime} seconds
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

          {pageState.hasSetDifficulty && pageState.isDifficultyMissing && (
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
            value={pageState.category}
            onChange={(e) => onCategoryChange(e.target.value)}
          />
          {pageState.hasSetCategory && pageState.isCategoryMissing && (
            <span className="text-xs text-red-500">
              {categoryMissingMessage}
            </span>
          )}
        </div>
        <button
          className={`mt-5 rounded-md ${
            pageState.isTimerActive ? "bg-purple-800" : "bg-purple-500"
          } p-2 text-lg text-white`}
          type="button"
          onClick={addRequest}
          disabled={pageState.isTimerActive}
        >
          Find practice partner
        </button>
      </div>
    </div>
  );
};

export default MatchRequestPage;
