import { useEffect, useState } from "react";

type PageSelectorDivProps = {
    setPage: (inputFunc: (val: number) => number) => void;
    currentPage: number;
    totalPages: number;
    displayedRange: number;
    disabled?: boolean;
};

const PageSelector = ({
    currentPage,
    totalPages,
    displayedRange,
    setPage,
    disabled = false,
}: PageSelectorDivProps) => {
    const [allPages, setAllPages] = useState<number[]>([]);
    const offset = Math.floor(displayedRange / 2);
    const actualRange = Math.ceil(displayedRange);
    useEffect(() => {
        // update the pages range
        const newPages = [];
        const startPage = Math.max(currentPage - offset, 0);
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
                disabled={currentPage === 0 || disabled}
            >
                First
            </button>
            {allPages.map((page) => {
                return (
                    <button
                        className="p-1 bg-primary-900 rounded border disabled:bg-gray-600 disabled:text-gray-100"
                        key={page}
                        onClick={() => setPage(() => page)}
                        disabled={page === currentPage || disabled}
                    >
                        {page + 1}
                    </button>
                );
            })}
            <button
                className="p-1 bg-primary-900 rounded border disabled:bg-gray-600 disabled:text-gray-100"
                onClick={() => setPage(() => Math.ceil(totalPages) - 1)}
                disabled={currentPage === Math.ceil(totalPages) - 1 || disabled}
            >
                Last
            </button>
        </div>
    );
};

export default PageSelector;