/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";

import { api } from "~/utils/api";

import { PageLayout } from "~/components/Layout";
import LoadingIcon from "~/components/LoadingIcon";

const MatchRequestPage = () => {
  const [pageState, setPageState] = useState({
    difficulty: -1,
    category: "",
    id: "",
    statusMessage: "",
    isWaiting: false,
    requestFailed: false,
    hasSubmitted: false,
    isTimerActive: false,
    waitingTime: 0,
    isEditing: false,
    difficultyFilter: "",
    categoryFilter: "",
  });

  const timer = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    if (pageState.isTimerActive) {
      if (!timer.current)
        timer.current = setInterval(() => {
          setPageState((prev) => ({
            ...prev,
            waitingTime: prev.waitingTime + 1,
          }));
        }, 1000);

      if (pageState.waitingTime > 0 && pageState.waitingTime % 600 === 0) {
        toast((t) => (
          <div className="flex flex-col justify-evenly">
            <span className="text-center mb-2">
              You have been waiting for {pageState.waitingTime / 60} minutes.
              Would you like to continue?
            </span>
            <div className="flex justify-evenly">
              <button
                className="border bg-red-500 rounded-md text-white p-2"
                onClick={() => {
                  toast.dismiss(t.id);
                  cancelRequest();
                }}
                type="button"
              >
                Cancel Request
              </button>
              <button
                className="border bg-stone-500 rounded-md text-white p-2"
                onClick={() => toast.dismiss(t.id)}
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        ));
      }
    }
  });

  const difficultyMissingMessage = "Please select a difficulty";
  const categoryMissingMessage = "Please enter a category";

  const difficultyLevels = [
    "Very Easy",
    "Easy",
    "Medium",
    "Hard",
    "Very Hard",
    "Insane",
  ];

  const difficultyColors = [
    "bg-green-500",
    "bg-lime-500",
    "bg-yellow-500",
    "bg-amber-500",
    "bg-orange-500",
    "bg-red-500",
  ];

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

    const value = event.currentTarget.getAttribute("value");

    setPageState((prev) => ({
      ...prev,
      difficulty: parseInt(value!),
    }));

    if (pageState.difficulty == -1) {
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
    setPageState((prev) => ({
      ...prev,
      category: value,
      isCategoryMissing: value ? false : true,
    }));
  };

  const router = useRouter();
  const { data: session, status } = useSession();

  const utils = api.useContext();

  api.matchRequest.subscribeToAllRequests.useSubscription(undefined, {
    onData(request) {
      console.log(request);
      void Promise.resolve(utils.matchRequest.invalidate());
    },
    onError(err) {
      console.log("Subscription error: ", err);
      void Promise.resolve(utils.matchRequest.invalidate());
    },
  });

  api.matchRequest.subscribeToJoinRequests.useSubscription(undefined, {
    onData(request) {
      console.log(request);
      void Promise.resolve(utils.matchRequest.invalidate());
    },
  });

  api.matchRequest.subscribeToConfirmation.useSubscription(undefined, {
    onData(request) {
      console.log(request);
      if (request.acceptId == session?.user.id) {
        clearInterval(timer.current!);
        setPageState((prev) => ({
          ...prev,
          isTimerActive: false,
          waitingTime: 0,
          isWaiting: false,
        }));
        timer.current = null;

        // TODO: join session
        console.log("Joining session...");
      }
    },
  });

  api.matchRequest.subscribeToDeclineRequests.useSubscription(undefined, {
    onData(request) {
      console.log(request);
      if (request.acceptId == session?.user.id) {
        console.log("Declined match");
        // Maybe include the request user's name in the toast message
        toast.error("Your match request was declined.");
      }
      void Promise.resolve(utils.matchRequest.invalidate());
    },
  });

  const allOtherRequests = api.matchRequest.getOtherRequests.useInfiniteQuery(
    {},
  );

  const allJoinRequests = api.matchRequest.getJoinRequests.useInfiniteQuery({});

  const queueSize = allOtherRequests.data
    ? allOtherRequests.data.pages.flat(2).length +
      (pageState.isTimerActive ? 1 : 0)
    : pageState.isTimerActive
    ? 1
    : 0;

  const addRequestMutation = api.matchRequest.addRequest.useMutation({
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const cancelRequestMutation = api.matchRequest.cancelRequest.useMutation({
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const editRequestMutation = api.matchRequest.editRequest.useMutation({
    onSuccess: (data) => {
      console.log(data);
    },
  });

  const addJoinRequestMutation = api.matchRequest.addJoinRequest.useMutation({
    onSuccess: () => {
      console.log("Waiting for partner to accept...");
    },
  });

  const confirmRequestMutation = api.matchRequest.confirmMatch.useMutation({
    onSuccess: () => {
      console.log("Joining session...");
    },
  });

  const declineMatchMutation = api.matchRequest.declineMatch.useMutation({
    onSuccess: () => {
      console.log("Declined match");
    },
  });

  const addRequest = () => {
    if (pageState.difficulty == -1 || pageState.category == "") {
      if (!pageState.hasSubmitted)
        setPageState((prev) => ({ ...prev, hasSubmitted: true }));
      return;
    }

    if (!session?.user) {
      toast.error("You must be logged in to use this feature");
      return;
    }

    setPageState((prev) => ({
      ...prev,
      isWaiting: true,
      isTimerActive: true,
      statusMessage: "Searching for partner...",
    }));

    setPageState((prev) => ({
      ...prev,
      id: session.user.id,
    }));

    addRequestMutation.mutate({
      id: session.user.id,
      name: session.user.name!,
      difficulty: pageState.difficulty,
      category: pageState.category,
    });

    void Promise.resolve(allOtherRequests.refetch());
  };

  const cancelRequest = () => {
    cancelRequestMutation.mutate({
      id: pageState.id,
      name: session?.user?.name ?? "",
      difficulty: pageState.difficulty,
      category: pageState.category,
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

  const onRequestDifficultySelect = () => {
    const requestDifficultyDropdownMenu = document.querySelector(
      ".request .request-dropdown-menu",
    );

    if (!requestDifficultyDropdownMenu?.classList.contains("active")) {
      requestDifficultyDropdownMenu?.classList.add("active");
    } else {
      requestDifficultyDropdownMenu.classList.remove("active");
    }
  };

  const selectRequestDifficulty = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
  ) => {
    event.preventDefault();

    const value = event.currentTarget.getAttribute("value");

    setPageState((prev) => ({
      ...prev,
      difficulty: parseInt(value!),
    }));
  };

  const updateRequest = () => {
    editRequestMutation.mutate({
      id: pageState.id,
      difficulty: pageState.difficulty,
      category: pageState.category,
    });
    const displayedDifficulty = document.querySelector(
      ".difficulty-menu .select",
    );
    if (displayedDifficulty)
      displayedDifficulty.innerHTML =
        difficultyLevels[pageState.difficulty] ?? displayedDifficulty.innerHTML;
    console.log("Request updated");
    setPageState((prev) => {
      return {
        ...prev,
        isEditing: !prev.isEditing,
      };
    });
  };

  const addJoinRequest = (partnerId: string) => {
    addJoinRequestMutation.mutate({
      joiningUser: session?.user?.name ?? "",
      joiningUserId: session?.user?.id ?? "",
      originalRequestId: partnerId || "",
    });

    toast.success("Waiting for partner to accept...");
  };

  const confirmMatch = (acceptId: string, requestId: string) => {
    clearInterval(timer.current!);
    setPageState((prev) => ({
      ...prev,
      isTimerActive: false,
      waitingTime: 0,
      isWaiting: false,
      incomingRequestUserId: "",
    }));
    timer.current = null;
    confirmRequestMutation.mutate({ acceptId, requestId });

    // TODO: join session
    console.log("Joining session...");
  };

  const declineMatch = (acceptId: string, requestId: string) => {
    declineMatchMutation.mutate({ acceptId, requestId });
  };

  if (status !== "authenticated") {
    return (
      <>
        <Head>
          <title>Profile</title>
        </Head>
        <PageLayout>
          <div className="w-full h-full flex flex-col justify-center items-center">
            <div className="align-middle">404 User not found</div>
            <div>
              <button
                className="text-neutral-400 rounded-md underline"
                onClick={() => void router.push("/signup/")}
              >
                Go to Signup
              </button>
            </div>
          </div>
        </PageLayout>
      </>
    );
  }

  // Remove current request immediately so that the user doesn't need to wait for timeout to send another request
  window.onunload = () => {
    // Only remove request for current page, not other pages with the same user
    if (pageState.isTimerActive) void Promise.resolve(cancelRequest());
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
              onClick={() => console.log("Joining session...")}
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
      <div className="absolute left-1/4 top-1/2 flex h-80 w-64 -translate-x-2/3 -translate-y-1/2 flex-col justify-evenly rounded-xl border p-5">
        <div className="difficulty-menu">
          <span className="choose">Choose Difficulty</span>

          <div className="dropdown" onClick={onDifficultySelect}>
            <div className="select text-center">
              <span>Select Difficulty</span>
            </div>
            <ul className="dropdown-menu">
              {difficultyLevels.map((difficulty, index) => (
                <li
                  key={index}
                  value={index}
                  onClick={(event) => selectDifficulty(event)}
                >
                  {difficulty}
                </li>
              ))}
            </ul>
          </div>

          {pageState.hasSubmitted && pageState.difficulty == -1 && (
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
          {pageState.hasSubmitted && pageState.category == "" && (
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
      <div className="absolute left-1/2 top-1/2 flex h-80 w-1/3 -translate-x-1/2 -translate-y-1/2 flex-col justify-evenly rounded-xl border p-5">
        <span className="absolute left-1/2 -translate-x-1/2 top-0 text-white ">
          {`All requests (${queueSize} online users)`}
        </span>
        <div className="absolute w-full" style={{ top: "15%", right: "0.5%" }}>
          <div className="flex justify-evenly">
            <input
              className="h-8 focus:outline-none rounded-md text-center"
              style={{ width: "40%" }}
              placeholder={"Filter by difficulty"}
              onChange={(e) =>
                setPageState((prev) => ({
                  ...prev,
                  difficultyFilter: e.target.value,
                }))
              }
            ></input>
            <input
              className="h-8 focus:outline-none rounded-md text-center"
              style={{ width: "40%" }}
              placeholder={"Filter by category"}
              onChange={(e) =>
                setPageState((prev) => ({
                  ...prev,
                  categoryFilter: e.target.value,
                }))
              }
            ></input>
          </div>
        </div>
        <div className="overflow-y-auto flex flex-col">
          {pageState.isTimerActive && (
            <div className="flex flex-col rounded-md bg-purple-500 m-2">
              <span className="text-left text-white pl-4">
                {session.user.name}
              </span>
              <div className="request">
                {!pageState.isEditing && (
                  <div
                    className={`w-1/3 flex justify-center items-center ${
                      difficultyColors[pageState.difficulty]
                    } rounded-md`}
                  >
                    <span className="text-white">
                      {difficultyLevels[pageState.difficulty]}
                    </span>
                  </div>
                )}
                {pageState.isEditing && (
                  <div
                    className="request-dropdown"
                    onClick={onRequestDifficultySelect}
                  >
                    <div
                      className={`request-select ${
                        difficultyColors[pageState.difficulty]
                      }`}
                    >
                      <span className="text-white">
                        {difficultyLevels[pageState.difficulty]}
                      </span>
                    </div>
                    <ul className="request-dropdown-menu">
                      {difficultyLevels.map((difficulty, index) => (
                        <li
                          key={index}
                          value={index}
                          onClick={(event) => selectRequestDifficulty(event)}
                        >
                          {difficulty}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!pageState.isEditing && (
                  <div className="w-1/3 flex justify-center items-center bg-stone-700 rounded-md">
                    <span className="text-white">{pageState.category}</span>
                  </div>
                )}
                {pageState.isEditing && (
                  <div className="w-1/3 flex justify-center items-center bg-stone-700 rounded-md">
                    <input
                      className="w-full rounded-md p-2 text-center focus:outline-none bg-stone-700 text-white "
                      type="text"
                      value={pageState.category}
                      onChange={(e) => onCategoryChange(e.target.value)}
                    />
                  </div>
                )}
                {!pageState.isEditing && (
                  <button
                    className="rounded-md p-2 text-white bg-emerald-500 w-1/4"
                    type="button"
                    onClick={() =>
                      setPageState((prev) => ({
                        ...prev,
                        isEditing: !prev.isEditing,
                      }))
                    }
                  >
                    Edit
                  </button>
                )}
                {pageState.isEditing && (
                  <button
                    className="rounded-md p-2 text-white bg-emerald-500 w-1/4"
                    type="button"
                    onClick={updateRequest}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
          )}
          {allOtherRequests.data?.pages
            .flat(2)
            .filter(
              (request) =>
                difficultyLevels[request.difficulty]
                  ?.toLowerCase()
                  .includes(pageState.difficultyFilter.toLowerCase()),
            )
            .filter((request) =>
              request.category
                .toLowerCase()
                .includes(pageState.categoryFilter.toLowerCase()),
            )
            .map((request, index) => (
              <div
                className="flex flex-col rounded-md bg-sky-500 m-2"
                key={index}
              >
                <span className="text-left text-white pl-4">
                  {request.name}
                </span>
                <div className="flex justify-evenly rounded-md p-2">
                  <div
                    className={`w-1/3 flex justify-center items-center ${
                      difficultyColors[request.difficulty]
                    } rounded-md`}
                  >
                    <span className="text-white">
                      {difficultyLevels[request.difficulty]}
                    </span>
                  </div>
                  <div className="w-1/3 flex justify-center items-center bg-stone-700 rounded-md">
                    <span className="text-white">{request.category}</span>
                  </div>
                  <button
                    className="rounded-md p-2 text-white bg-emerald-500 w-1/4"
                    type="button"
                    onClick={() => addJoinRequest(request.id)}
                  >
                    Request to join
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="absolute left-3/4 top-1/2 flex h-80 w-1/4 -translate-x-1/4 -translate-y-1/2 flex-col rounded-xl border p-2 items-center justify-evenly">
        <span className="absolute left-1/2 -translate-x-1/2 top-0 text-white py-2">
          Requests from others
        </span>
        <div
          className="overflow-y-auto w-full flex flex-col items-center"
          style={{ height: "80%" }}
        >
          {allJoinRequests.data?.pages.flat(2).map((request, index) => (
            <div
              key={index}
              className="flex flex-col border w-3/4  justify-items-center rounded-md bg-black text-white p-2 m-2"
              style={{ top: "12.5%" }}
            >
              <span>
                {(request as { fromName: string }).fromName} wants to join!
              </span>
              <div className="flex justify-evenly items-center p-2">
                <button
                  className="rounded-md p-2 text-white bg-emerald-500 w-1/3"
                  type="button"
                  onClick={() =>
                    confirmMatch(
                      (request as { fromId: string }).fromId,
                      (request as { toId: string }).toId,
                    )
                  }
                >
                  Accept
                </button>
                <button
                  className="rounded-md p-2 text-white bg-red-500 w-1/3"
                  type="button"
                  onClick={() =>
                    declineMatch(
                      (request as { fromId: string }).fromId,
                      (request as { toId: string }).toId,
                    )
                  }
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatchRequestPage;
