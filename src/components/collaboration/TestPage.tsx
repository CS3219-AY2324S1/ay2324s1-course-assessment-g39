import { useEffect, useRef, useState } from "react";

import { api } from "~/utils/api";

const TestPage = () => {
  const [difficulty, setDifficulty] = useState(0);
  const [category, setCategory] = useState("array");
  const [response, setResponse] = useState("");
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0);
  const timer = useRef<NodeJS.Timer | null>(null);

  const handleDifficultyChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setDifficulty(parseInt(event.target.value));
  };

  const handleCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setCategory(event.target.value);
  };

  const requestMutation = api.matchUsers.sendRequest.useMutation({
    onSuccess: (data) => {
      setResponse(data.msg);
      clearInterval(timer.current!);
      setIsTimerActive(false);
      setWaitingTime(0);
      timer.current = null;
    },
  });

  const getMatch = () => {
    setIsTimerActive(true);
    requestMutation.mutate({
      difficulty: difficulty,
      category: category,
    });
  };

  useEffect(() => {
    if (isTimerActive && !timer.current) {
      timer.current = setInterval(() => {
        setWaitingTime((prev) => prev + 1);
      }, 1000);
    }
  });

  return (
    <>
      <button type="button" onClick={getMatch}>
        Click me
      </button>
      <select value={difficulty} onChange={handleDifficultyChange}>
        <option value="0">Very Easy</option>
        <option value="1">Easy</option>
        <option value="2">Medium</option>
        <option value="3">Hard</option>
        <option value="4">Very Hard</option>
        <option value="5">Insane</option>
      </select>
      <select value={category} onChange={handleCategoryChange}>
        <option value="array">Array</option>
        <option value="string">String</option>
        <option value="hashtable">Hash Table</option>
        <option value="tree">Tree</option>
        <option value="dp">Dynamic Programming</option>
        <option value="graph">Graph</option>
      </select>
      <span>{difficulty}</span>
      <span>{category}</span>
      <span>{response}</span>
      <span>{waitingTime}s</span>
    </>
  );
};

export default TestPage;
