/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { RouterOutputs, RouterInputs, api } from "~/utils/api";
import { type MatchType } from "@prisma-db-psql/client";

import { WithAuthWrapper } from "~/components/wrapper/AuthWrapper";
import useMatchUsers from "~/hooks/useMatchUsers";

import { difficulties } from "../../types/global";
import Head from "next/head";
import { PageLayout } from "~/components/Layout";
import { LoadingSpinner } from "~/components/Loading";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const REQUEST_EXPIRY_TIME_SECS = 30;
const MatchRequestPage = () => {
  const { data: session } = useSession();
  if (!session || !session.user) {
    throw new Error("Session cannot be undefined since AuthWrapper wrapped");
  }
  const curUserId = session.user.id;

  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const [time, setTime] = useState(0);

  const stopTimer = () => {
    if (intervalRef.current) { 
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTime(0);
  };


  // remove current request immediately on refresh or change of page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (curUserMatchRequest) {
        handleDeleteMatchRequest();
        e.preventDefault();
        e.returnValue = "";
        return "Are you sure you want to leave this page? Request will be deleted";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  });


  const matchUsers = useMatchUsers();
  const [isCreatingMatchRequest, setIsCreatingMatchRequest] = useState(false);
  const [isEditingMatchRequest, setIsEditingMatchRequest] = useState(false);
  const [isDeletingMatchRequest, setIsDeletingMatchRequest] = useState(false);

  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // our definition of online users are users who are looking for a match
  const { data: numOfOnlineUsers = 0, refetch: refetchGetNumOfMatchReqs } =
    api.matchRequest.getNumOfMatchRequests.useQuery();

  const { data: curUserMatchRequest, refetch: refetchCurrentUserRequest } =
    api.matchRequest.getCurrentUserRequest.useQuery(undefined, {
      onError() {
        toast.error("Error loading current user's match request");
      },
    });

  const { mutate: createMatchRequest } =
    api.matchRequest.createCurrentUserMatchRequest.useMutation({
      onSuccess() {
        if (isCreatingMatchRequest) {
          toast.success("Created match request");
        }
        setIsCreatingMatchRequest(false);
        void refetchCurrentUserRequest();
        void refetchGetNumOfMatchReqs();
      },
      onError(err) {
        toast.error(err.message);
        toast.error("Error creating match request");
      },
    });

  const { mutate: deleteMatchRequest } =
    api.matchRequest.deleteCurrentUserMatchRequest.useMutation({
      onSuccess() {
        stopTimer();
        void refetchCurrentUserRequest();
        void refetchGetNumOfMatchReqs();
        if (isDeletingMatchRequest) {
          toast.success("Deleted match request");
        }
        setIsDeletingMatchRequest(false);
      },
      onError() {
        toast.error("Error deleting match request");
      },
    });

  const { mutate: updateMatchRequest } =
    api.matchRequest.updateCurrentUserMatchRequest.useMutation({
      onSuccess() {
        if (isEditingMatchRequest) {
          toast.success("Updated match request");
        }
        setIsEditingMatchRequest(false);
        void refetchCurrentUserRequest();
      },
      onError() {
        toast.error("Error updating match request");
      },
    });

  // subscprtions api -- START
  api.matchRequest.subscribeToManualMatchRequestsChange.useSubscription(
    undefined,
    {
      onData() {
        void refetchGetManualRequests();
      },
    },
  );

  api.matchRequest.subscribeToMyRequestSuccess.useSubscription(undefined, {
    onData(data) {
      matchUsers.setMatchedUsers(data.userId1, data.userId2);
    },
  });
  // subscprtions api -- END


  useEffect(() => {
    if (time >= REQUEST_EXPIRY_TIME_SECS && curUserMatchRequest) {
      console.log(curUserMatchRequest);
      const { difficulty, category, matchType } = curUserMatchRequest;
      const sameRequest = { difficulty, category, matchType };
      deleteMatchRequest({ matchType: curUserMatchRequest.matchType });
      toast(
        (t) => (
          <div className="flex flex-col justify-evenly text-slate-800">
            <span className="text-center mb-2">No requests found 🫠.</span>
            <div className="flex justify-stretch">
              <button
                className="border bg-blue-500 rounded-md text-slate-100 p-2 mr-1"
                onClick={() => {
                  toast.dismiss(t.id);
                  createMatchRequest(sameRequest);
                }}
                type="button"
              >
                Recreate again
              </button>
              <button
                className="border bg-stone-500 rounded-md text-slate-100 p-2"
                onClick={() => toast.dismiss(t.id)}
                type="button"
              >
                Dismiss
              </button>
            </div>
          </div>
        ),
        { duration: 60000, id: "timeout", position: "top-center" },
      );
    }
  }, [time]);

  useEffect(() => {
    if (!curUserMatchRequest) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    const timeDiff = new Date().getTime() - curUserMatchRequest.createdAt.getTime();
    const timeLeft = REQUEST_EXPIRY_TIME_SECS - Math.round(timeDiff / 1000);
    if (timeLeft < 0) {
      setTime(REQUEST_EXPIRY_TIME_SECS);
      return;
    }
    setTime(REQUEST_EXPIRY_TIME_SECS - timeLeft);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    intervalRef.current = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);
  }, [curUserMatchRequest]);

  const {
    data: manualRequests = [],
    refetch: refetchGetManualRequests,
    isLoading: requestsLoading,
  } = api.matchRequest.getAllManualMatchRequests.useQuery();

  const { mutate: acceptManualMatch, variables: data } =
    api.matchRequest.acceptManualMatch.useMutation({
      onSuccess: () => {
        if (!data) throw new Error("matchedIds is undefined");
        matchUsers.setMatchedUsers(curUserId, data.acceptedUserId);
        stopTimer();
      },
      onError: () => {
        toast.error("Error accepting match request");
      },
    });

  const handleCreateMatchRequest = (data: CreateMatchRequestData) => {
    const { difficulty, category, automaticMatching } = data;
    createMatchRequest({
      difficulty,
      category,
      matchType: automaticMatching ? "AUTO" : "MANUAL",
    });
  };

  const handleDeleteMatchRequest = () => {
    setIsDeletingMatchRequest(true);
    if (curUserMatchRequest) {
      deleteMatchRequest({ matchType: curUserMatchRequest.matchType });
    }
  };

  type UpdateToMatchRequest =
    RouterInputs["matchRequest"]["updateCurrentUserMatchRequest"];
  const handleUpdateRequest = (request: UpdateToMatchRequest) => {
    updateMatchRequest(request);
  };

  const handleAcceptRequest = (acceptedUserId: string) => {
    acceptManualMatch({ acceptedUserId });
  };

  const numOfOtherOnlineUsers = curUserMatchRequest
    ? numOfOnlineUsers - 1
    : numOfOnlineUsers;
  const otherUsersManualRequests = manualRequests.filter(
    (r) => r.user.id !== curUserId,
  );

  return (
    <>
      <Head>
        <title>Find practice partner</title>
      </Head>
      {curUserMatchRequest && (
        <RequestStatus matchType={curUserMatchRequest.matchType} time={time} />
      )}
      <PageLayout>
        <div className="flex flex-col h-full items-center justify-center bg-slate-800 text-center">
          <div className="space-y-4">
            <div className="flex flex-row justify-between">
              <div className="text-left">Find a practice partner</div>
              <div className="text-right">{`(${numOfOnlineUsers} online users)`}</div>
            </div>
            {curUserMatchRequest && (
              <>
                {!isEditingMatchRequest && (
                  <UserOwnMatchRequestView
                    userRequest={curUserMatchRequest}
                    setIsEditingTrue={() => setIsEditingMatchRequest(true)}
                    handleDelete={handleDeleteMatchRequest}
                  />
                )}
                {isEditingMatchRequest && (
                  <UpdateMatchRequestForm
                    onUpdate={(data) => handleUpdateRequest(data)}
                    handleCancel={() => setIsEditingMatchRequest(false)}
                    curData={{
                      category: curUserMatchRequest.category,
                      difficulty: curUserMatchRequest.difficulty,
                      matchType: curUserMatchRequest.matchType,
                    }}
                  />
                )}
              </>
            )}
            {!curUserMatchRequest && (
              <>
                {!isCreatingMatchRequest && (
                  <div
                    className="bg-slate-200 py-2 rounded-md text-slate-800 hover:bg-slate-300"
                    onClick={() => setIsCreatingMatchRequest(true)}
                  >
                    + Add your own request
                  </div>
                )}
                {isCreatingMatchRequest && (
                  <CreateMatchRequestForm
                    onCreate={handleCreateMatchRequest}
                    handleCancel={() => setIsCreatingMatchRequest(false)}
                  />
                )}
              </>
            )}
            <div className="border border-slate-100 p-6 rounded-md">
              <div className="text-start space-y-4">
                <div>Public Requests</div>
                <div className="flex flex-row justify-evenly items-center space-x-4 text-black">
                  <input
                    className="rounded-md text-center"
                    placeholder={"Filter by difficulty"}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                  ></input>
                  <input
                    className="rounded-md text-center"
                    placeholder={"Filter by category"}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  ></input>
                </div>
              </div>
              <div className="py-4" />
              <div className="">
                <table className="w-full text-sm text-left text-gray-500 dark:text-slate-300">
                  <thead className="dark:text-slate-200">
                    <tr>
                      <th scope="col" className="w-auto pr-3">
                        Difficulty
                      </th>
                      <th scope="col" className="w-auto pr-3">
                        Category
                      </th>
                      <th scope="col" className="w-auto pr-3">
                        Name
                      </th>
                      <th scope="col" className="w-auto"></th>
                    </tr>
                  </thead>
                  <tbody className="space-y-6 bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    {otherUsersManualRequests
                      .filter(
                        (r) =>
                          !difficultyFilter ||
                          r.difficulty
                            .toLowerCase()
                            .startsWith(difficultyFilter.toLowerCase()),
                      )
                      .filter(
                        (r) =>
                          !categoryFilter ||
                          r.category
                            .toLowerCase()
                            .startsWith(categoryFilter.toLowerCase()),
                      )
                      .map((request) => (
                        <tr key={request.user.name}>
                          <td className="w-auto pr-3">{request.difficulty}</td>
                          <td className="w-auto pr-3">{request.category}</td>
                          <td className="w-auto pr-3">{request.user.name}</td>
                          <td className="w-auto text-right">
                            <button
                              className="light:bg-blue-600 dark:bg-blue-400 px-2 rounded-md text-slate-800 hover:bg-slate-300"
                              onClick={() =>
                                handleAcceptRequest(request.user.id)
                              }
                            >
                              ACCEPT
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!requestsLoading &&
                  otherUsersManualRequests.length === 0 &&
                  (numOfOtherOnlineUsers == 0 ? (
                    <>
                      <div className="py-2" />
                      <div className="bg-slate-700 rounded-lg block text-center text-sm py-4">
                        🥲 <br />
                        Bummer! No other online users.
                        <br />
                        Maybe ask a friend to come on to code with you?
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-700 rounded-lg block text-center text-sm py-2 mt-2">
                      No available public requests.
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

// Define the schema for the match request fields
const createMatchRequestSchema = z.object({
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  category: z.string().min(1),
  automaticMatching: z.boolean(),
});
type CreateMatchRequestData = z.infer<typeof createMatchRequestSchema>;
type CreateMatchRequestFormProps = {
  onCreate: (data: CreateMatchRequestData) => void;
  handleCancel: () => void;
};
const CreateMatchRequestForm = ({
  onCreate,
  handleCancel,
}: CreateMatchRequestFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateMatchRequestData>({
    resolver: zodResolver(createMatchRequestSchema),
  });

  const onSubmit: SubmitHandler<CreateMatchRequestData> = (data) => {
    onCreate(data);
  };

  return (
    <form
      className="relative flex flex-col text-start items-stretch space-y-4 md:space-y-6 border p-4 rounded-md"
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
    >
      <button
        className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition transform hover:scale-110"
        onClick={handleCancel}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <div>
        <label className="self-start block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Difficulty
        </label>
        <select
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm font-medium rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          {...register("difficulty")}
        >
          {difficulties.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Category
        </label>
        <input
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          type="text"
          {...register("category")}
        />
        {errors.category && (
          <span className="text-red-500">{errors.category.message}</span>
        )}
      </div>
      <div>
        <label className="mr-2 mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Automatic Matching
        </label>
        <input type="checkbox" {...register("automaticMatching")} />
      </div>
      <button
        className="w-full text-white bg-slate-500 hover:bg-slate-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-slate-400 dark:hover:bg-slate-500 dark:focus:ring-primary-800"
        type="submit"
      >
        Create Match Request
      </button>
    </form>
  );
};

type MatchRequest = RouterOutputs["matchRequest"]["getCurrentUserRequest"];
type CurrentUserMatchRequestProps = {
  userRequest: MatchRequest;
  setIsEditingTrue: () => void;
  handleDelete: () => void;
};
const UserOwnMatchRequestView = ({
  userRequest,
  setIsEditingTrue,
  handleDelete,
}: CurrentUserMatchRequestProps) => {
  if (!userRequest) return <LoadingSpinner />;
  return (
    <div className="border border-slate-100 p-6 rounded-md text-start space-y-4">
      <div>Your Request</div>
      <table className="w-full text-sm text-left text-gray-500 dark:text-slate-300">
        <thead className="dark:text-slate-200">
          <tr>
            <th scope="col" className="w-auto pr-3">
              Difficulty
            </th>
            <th scope="col" className="w-auto pr-3">
              Category
            </th>
            <th scope="col" className="w-auto pr-3">
              Name
            </th>
            <th scope="col" className="w-auto"></th>
          </tr>
        </thead>
        <tbody className="space-y-6 bg-white border-b dark:bg-gray-800 dark:border-gray-700">
          <tr key={userRequest.user.name}>
            <td className="w-auto pr-3">{userRequest.difficulty}</td>
            <td className="w-auto pr-3">{userRequest.category}</td>
            <td className="w-auto pr-3">{userRequest.user.name}</td>
            <td className="w-auto text-right">
              <button
                className="light:bg-blue-600 dark:bg-blue-400 px-2 rounded-md text-slate-800 hover:bg-slate-300"
                onClick={setIsEditingTrue}
              >
                EDIT
              </button>
            </td>
            <td className="w-auto text-right">
              <button
                className="light:bg-blue-600 dark:bg-blue-400 px-2 rounded-md text-slate-800 hover:bg-slate-300"
                onClick={handleDelete}
              >
                DELETE
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Define the schema for the match request fields
const updateMatchRequestSchema = z.object({
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  category: z.string().min(1),
  matchType: z.enum(["AUTO", "MANUAL"]),
});
type UpdateMatchRequestData = z.infer<typeof updateMatchRequestSchema>;
type UpdateMatchRequestFormProps = {
  onUpdate: (data: UpdateMatchRequestData) => void;
  handleCancel: () => void;
  curData: UpdateMatchRequestData;
};
const UpdateMatchRequestForm = ({
  onUpdate,
  handleCancel,
  curData,
}: UpdateMatchRequestFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateMatchRequestData>({
    resolver: zodResolver(updateMatchRequestSchema),
  });

  const onSubmit: SubmitHandler<UpdateMatchRequestData> = (data) => {
    onUpdate(data);
  };

  return (
    <form
      className="relative flex flex-col text-start items-stretch space-y-4 md:space-y-6 border p-4 rounded-md"
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
    >
      <button
        className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition transform hover:scale-110"
        onClick={handleCancel}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <div>
        <label className="self-start block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Difficulty
        </label>
        <select
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm font-medium rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          {...register("difficulty")}
          defaultValue={curData.difficulty}
        >
          {difficulties.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Category
        </label>
        <input
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          type="text"
          defaultValue={curData.category}
          {...register("category")}
        />
        {errors.category && (
          <span className="text-red-500">{errors.category.message}</span>
        )}
      </div>
      <div className="hidden">
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Match Type
        </label>
        <input
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          type="text"
          defaultValue={curData.matchType}
          {...register("matchType")}
        />
        {errors.category && (
          <span className="text-red-500">{errors.category.message}</span>
        )}
      </div>
      <button
        className="w-full text-white bg-slate-500 hover:bg-slate-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-slate-400 dark:hover:bg-slate-500 dark:focus:ring-primary-800"
        type="submit"
      >
        Update Match Request
      </button>
    </form>
  );
};

const RequestStatus = (props: { matchType: MatchType; time: number }) => {
  const msg =
    props.matchType === "AUTO"
      ? "Finding a request for you"
      : "Pending request acceptance";
  return (
    <div className="fixed top-0 left-0 translate-x-1/2 translate-y-1/2 w-1/2">
      <div className="animate-pulse flex items-center justify-center">
        <div className="bg-slate-200 rounded-md text-slate-800 px-6 py-3 flex items-center">
          <svg
            className="animate-spin h-5 w-5 text-slate-600 mr-3"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            ></path>
          </svg>
          {msg}
          <span className="pl-1">{`(${
            REQUEST_EXPIRY_TIME_SECS - props.time
          } seconds)`}</span>
        </div>
      </div>
    </div>
  );
};

export default WithAuthWrapper(MatchRequestPage);
