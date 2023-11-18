import { useEffect, useState } from "react";
import { type Difficulty } from "~/types/global";
import { api } from "~/utils/api";
import ModalLayout from "../layout/ModalLayout";
import PageSelector from "../PageSelector";

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
          <PageSelector
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
