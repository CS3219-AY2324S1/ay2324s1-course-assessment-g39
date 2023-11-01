import { boolean } from "zod";
import ModalLayout from "../layout/ModalLayout";
import { useEffect, useState } from "react";
import { StyledInput } from "../StyledInput";
import { Difficulty } from "~/types/global";
import { StyledButton } from "../StyledButton";


type QuestionToggleModalProps = {
    questionTitleList: { title: string; id: string; category: string; difficulty: Difficulty }[];
    setQuestionId: (questionTitle: string) => void;
};

/**
 * Pagination not needed -> only text
 */
const QuestionToggleModal = ({
    questionTitleList,
    setQuestionId
}: QuestionToggleModalProps) => {
    const [filter, setFilter] = useState("");
    const [openModal, setOpenModal] = useState<boolean>(false);
    // generate the pages of the question titles
    // add autocomplete to the questions
    const [filteredQuestions, setFilteredQuestions] = useState(questionTitleList);
    useEffect(() => {
        setFilteredQuestions(questionTitleList.filter((val) => {
            if (filter === "") return true;
            return val.title.includes(filter);
        }));
    }, [questionTitleList, filter]);
    return <ModalLayout buttonText={"Select Question"} buttonStyling="w-1/2" modalValue={openModal} onModalChange={(val) => setOpenModal(val)} >
        <div className="flex flex-col items-center justify-center p-5 mt-9 overflow-auto">
            <StyledInput placeholder="filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
            {/* Table */}
            <div className="overflow-auto max-h-[20vh]">
            <table className="w-full text-left border">
                <thead>
                <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Difficulty</th>
                </tr>
                </thead>
                <tbody>
                {filteredQuestions.map((data) => {
                    return <tr className="hover:bg-slate-500 cursor-pointer" key={data.id} onClick={(e) => {
                        e.preventDefault();
                        setQuestionId(data.id);
                        setOpenModal(false);
                    }}>
                        <td>{data.title}</td>
                        <td>{data.category}</td>
                        <td>{data.difficulty}</td>
                    </tr>
                })}
                </tbody>
            </table>
            </div>
        </div>
    </ModalLayout>
}

export default QuestionToggleModal;






