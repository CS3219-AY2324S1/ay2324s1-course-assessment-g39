import { useEffect, useRef, useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";

import { Client } from "@stomp/stompjs";
import type { Message } from "@stomp/stompjs";
import { api } from "~/utils/api";

import { PageLayout } from "~/components/Layout";
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
    hasSubmitted: false,
    isTimerActive: false,
    waitingTime: 0,
  });

  const timer = useRef<NodeJS.Timer | null>(null);

  const amqpClient = useMemo(() => {
    const client = new Client({
      brokerURL: "ws://localhost:15674/ws",
      onConnect: () => {
        client.subscribe("/topic/broadcast", (message: Message) =>
          console.log(`Received: ${message.body}`),
        );

        console.log("Connected to RabbitMQ");
      },
      onDisconnect: () => {
        client.unsubscribe("/topic/broadcast");
      },
      onWebSocketError: (event: Event) => {
        console.error("WebSocket error: ", event);
      },
      onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers.message);
        console.error("Additional details: " + frame.body);
      },
    });

    return client;
  }, []);

  amqpClient.activate();

  useEffect(() => {
    if (pageState.isTimerActive && !timer.current) {
      timer.current = setInterval(() => {
        setPageState((prev) => ({
          ...prev,
          waitingTime: prev.waitingTime + 1,
        }));
      }, 1000);
    }
  }, [pageState.isTimerActive]);

  useEffect(() => {
    if (pageState.isTimerActive) {
      if (pageState.waitingTime >= 30) {
        void Promise.resolve(
          amqpClient.publish({
            destination: "/queue/cancel_request_queue",
            headers: {
              id: pageState.id,
            },
          }),
        );
        setPageState((prev) => ({
          ...prev,
          statusMessage: "Timeout. No match found.",
          requestFailed: true,
          isTimerActive: false,
          waitingTime: 0,
        }));
        clearInterval(timer.current!);
        timer.current = null;
      } else {
        amqpClient.publish({
          destination: "/queue/check_status",
          body: pageState.id,
        });
      }
    }
  }, [
    amqpClient,
    pageState.id,
    pageState.isTimerActive,
    pageState.waitingTime,
  ]);

  useEffect(() => {
    const handleBeforeTabClose = (event: BeforeUnloadEvent) => {
      event.preventDefault();

      return (event.returnValue = "Are you sure you want to exit?");
    };

    window.addEventListener("beforeunload", handleBeforeTabClose);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeTabClose);
    };
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

  const router = useRouter();
  const { data: session, status } = useSession();

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
          statusMessage: data.msg,
          requestFailed: false,
        }));
      } else {
        setPageState((prev) => ({
          ...prev,
          statusMessage: data.msg,
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

    if (!pageState.id)
      setPageState((prev) => ({
        ...prev,
        id: session.user.id,
      }));

    if (amqpClient.connected) {
      console.log("connected");
      amqpClient.publish({
        destination: "/queue/add_request_queue",
        headers: {
          id: session.user.id,
          difficulty: pageState.difficulty.toString(),
          category: pageState.category,
        },
      });
    }
  };

  const cancelRequest = () => {
    clearInterval(timer.current!);
    setPageState((prev) => ({
      ...prev,
      isTimerActive: false,
      waitingTime: 0,
      isWaiting: false,
    }));
    timer.current = null;
    amqpClient.publish({
      destination: "/queue/cancel_request_queue",
      headers: {
        id: pageState.id,
      },
    });
  };

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

  // TODO: join session
  const joinSession = () => {
    console.log("join session");
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
    // router.push("/signup/");
  }

  // Remove current request immediately so that the user doesn't need to wait for timeout to send another request
  window.onunload = () => {
    // Only remove request for current page, not other pages with the same user
    if (pageState.isTimerActive) void Promise.resolve(cancelRequest());

    if (amqpClient.connected) void Promise.resolve(amqpClient.deactivate());
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
    </div>
  );
};

export default MatchRequestPage;
