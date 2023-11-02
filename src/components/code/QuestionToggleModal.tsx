import { boolean } from "zod";
import ModalLayout from "../layout/ModalLayout";
import { useEffect, useState } from "react";
import { StyledInput } from "../StyledInput";
import { Difficulty } from "~/types/global";
import { StyledButton } from "../StyledButton";
import { api } from "~/utils/api";
import useDebounce from "~/hooks/useDebounce";

type ReducedQuestion = {
  title: string;
  id: string;
  category: string;
  difficulty: Difficulty;
};

type QuestionToggleModalProps = {
  questionTitleList: ReducedQuestion[];
  setQuestionId: (questionTitle: string) => void;
};

type SelectPageDivProps = {
  setPage: (inputFunc: (val: number) => number) => void;
  currentPage: number;
  totalPages: number;
  displayedRange: number;
};
const SelectPageDiv = ({
  currentPage,
  totalPages,
  displayedRange,
  setPage,
}: SelectPageDivProps) => {
  const [allPages, setAllPages] = useState<number[]>([]);
  const offset = Math.floor(displayedRange / 2);
  const actualRange = Math.ceil(displayedRange);
  useEffect(() => {
    // update the pages range
    const newPages = [];
    const startPage = currentPage - offset < 0 ? 0 : currentPage - offset;
    for (
      let i = startPage;
      i < totalPages && i < startPage + actualRange;
      ++i
    ) {
      newPages.push(i);
    }
    setAllPages(newPages);
  }, [totalPages, currentPage, displayedRange]);
  return (
    <div className="flex flex-row gap-2 m-3">
      <button
        className="p-1 bg-primary-900 rounded border disabled:bg-gray-600 disabled:text-gray-100"
        onClick={() => setPage(() => 0)}
        disabled={currentPage === 0}
      >
        First
      </button>
      {allPages.map((page) => {
        return (
          <button
            className="p-1 bg-primary-900 rounded border disabled:bg-gray-600 disabled:text-gray-100"
            key={page}
            onClick={() => setPage(() => page)}
            disabled={page === currentPage}
          >
            {page + 1}
          </button>
        );
      })}
      <button
        className="p-1 bg-primary-900 rounded border disabled:bg-gray-600 disabled:text-gray-100"
        onClick={() => setPage(() => Math.ceil(totalPages) - 1)}
        disabled={currentPage === Math.ceil(totalPages) - 1}
      >
        Last
      </button>
    </div>
  );
};

const pagingLimit = 50;

const QuestionToggleModal = ({ setQuestionId }: QuestionToggleModalProps) => {
  const [filter, setFilter] = useState("");
  const [sentFilter, setSentFilter] = useState("");
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [page, setPage] = useState(0);
  const [filteredQuestions, setFilteredQuestions] = useState<ReducedQuestion[]>(
    [],
  );
  const pagedTitleData = api.question.getAllReducedInfinite.useInfiniteQuery(
    {
      limit: pagingLimit,
      titleFilter: sentFilter === "" ? undefined : sentFilter,
    },
    {
      getNextPageParam: (prevPage) => prevPage.nextCursor,
    },
  );

  useEffect(() => {
    setFilteredQuestions(pagedTitleData.data?.pages.at(page)?.items ?? []);
  }, [page, pagedTitleData.data?.pages]);

  return (
    <ModalLayout
      buttonText={"Select Question"}
      buttonStyling="w-1/2"
      modalValue={openModal}
      onModalChange={(val) => setOpenModal(val)}
    >
      <div className="flex flex-col items-center justify-center w-full h-full p-5 mt-9 overflow-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSentFilter(filter);
          }}
          className="flex flex-row gap-2"
        >
          <input
            type="text"
            className="p-3 bg-slate-800 text-white"
            placeholder="filter (Enter to submit)"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          />
          <button className="bg-slate-500 rounded p-3" type="submit">
            Filter
          </button>
        </form>
        {/* Table */}
        <div className="overflow-auto max-h-[50vh]">
          <SelectPageDiv
            displayedRange={5}
            setPage={(val: (prev: number) => number) => {
              // need to fetch first
              const fetchPages = async () => {
                const newPage = val(page);
                for (let i = page; i < newPage; ++i) {
                  await pagedTitleData.fetchNextPage();
                }
                setPage(val);
              };
              void fetchPages();
              return;
            }}
            currentPage={page}
            totalPages={
              (pagedTitleData.data?.pages.at(0)?.totalCount ?? 0) / pagingLimit
            }
          />
          <table className="w-[800px] overflow-auto text-left border">
            <thead>
              <tr>
                <th className="border">Title</th>
                <th className="border">Category</th>
                <th className="border">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((data) => {
                return (
                  <tr
                    className="hover:bg-slate-500 cursor-pointer"
                    key={data.id}
                    onClick={(e) => {
                      e.preventDefault();
                      setQuestionId(data.id);
                      setOpenModal(false);
                    }}
                  >
                    <td className="border">{data.title}</td>
                    <td className="border">{data.category}</td>
                    <td className="border">{data.difficulty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ModalLayout>
  );
};

export default QuestionToggleModal;
