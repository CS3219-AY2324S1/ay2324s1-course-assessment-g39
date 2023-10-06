import Head from "next/head";
import { useState } from "react";

import { api } from "~/utils/api";
import { Question, type QuestionMap } from "../../types/global.d";
import { equals } from "../../utils/utils";
import { QuestionRow } from "../../components/QuestionRow";
import { StyledButton } from "../../components/StyledButton";
import { StyledCheckbox } from "../../components/StyledCheckbox";
import { makeMap } from "../../utils/utils";
import { toast } from "react-hot-toast";

export default function Questions() {

    const getAllQuery = api.useContext().question.getAll;

    const [viewQns, setViewQns] = useState<QuestionMap>(new Map());
    const [changedQns, setChangedQns] = useState(new Set<string>());
    const [deletedQns, setDeletedQns] = useState(new Set<string>());

    const questions = makeMap(api.question.getAll.useQuery(undefined, {
        onSuccess: (data) => {
            const mappedData = data.map((q) => ({
                id: q.id,
                ...(changedQns.has(q.id) ? viewQns.get(q.id) ?? q : q)
            }));
            setViewQns(makeMap(mappedData, 'id'));
        },
        onError: (e) => {
            toast.error("Failed to fetch questions: " + e.message);
        },
    }).data ?? [], 'id');

    const hasChanges = (id: string) => {
        const q1 = questions.get(id);
        const q2 = viewQns.get(id);
        return q1 && q2 && !equals(q1, q2);
    }

    const addMutation = api.question.addOne.useMutation({
        onSuccess: () => { void getAllQuery.invalidate() },
        onError: (e, { title }) => {
            toast.error(`Failed to add question '${title}':\n\t${e.message}`);
        }
    });

    const updateMutation = api.question.updateOne.useMutation({
        onSuccess: () => { void getAllQuery.invalidate() },
        onError: (e, { title }) => {
            toast.error(`Failed to update question '${title}':\n\t${e.message}`);
        }
    });

    const deleteMutation = api.question.deleteOne.useMutation({
        onSuccess: () => { void getAllQuery.invalidate() },
        onError: (e, { id }) => {
            toast.error(`Failed to delete question '${id}':\n\t${e.message}`);
        }
    });

    const pushNew = () => {
        addMutation.mutate(new Question());
    };

    const saveUpdated = (id: string, q: Question) => {
        setViewQns(new Map(viewQns.set(id, q)));
        if (hasChanges(id)) {
            changedQns.add(id);
        } else {
            changedQns.delete(id);
        }
        setChangedQns(new Set(changedQns));
    }

    const clearUpdated = () => {
        setChangedQns(new Set());
        setViewQns(new Map(questions));
    };

    const pushUpdated = () => {
        changedQns.forEach((id) => {
            if (!hasChanges(id)) return;
            updateMutation.mutate({ id, ...viewQns.get(id) }, {
                onSuccess: () => {
                    changedQns.delete(id) && setChangedQns(new Set(changedQns));
                }
            });
        });
    };

    const saveDeleted = (id: string) => {
        if (deletedQns.has(id)) {
            deletedQns.delete(id);
        } else {
            deletedQns.add(id);
        }
        setDeletedQns(new Set(deletedQns));
    }

    const toggleAllDeleted = () => {
        if (deletedQns.size === viewQns.size) {
            setDeletedQns(new Set());
        } else {
            setDeletedQns(new Set(viewQns.keys()));
        }
    }

    const pushDeleted = () => {
        deletedQns.forEach((id => {
            if (!questions.has(id)) return;
            deleteMutation.mutate({ id }, {
                onSuccess: () => {
                    deletedQns.delete(id) && setDeletedQns(new Set(deletedQns));
                }
            });
        }));
    }

    return (
        <>
            <Head>
                <title>PeerPrep</title>
                <meta name="description" content="Supercharge your interview prep" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className=" flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[var(--bg-1)] to-[var(--bg-2)]">
                <div className="container flex flex-col items-center justify-center px-12 py-28 max-w-screen-xl">
                    <h1 className="text-5xl font-extrabold tracking-tight mb-12 text-[var(--txt-3)] sm:text-[5rem]">
                        Peer<span className="text-[var(--txt-1)]">Prep</span>
                    </h1>
                    {/* x - 2 - 4 - 1 - 2 */}
                    <div className="text-[var(--txt-3)] w-full flex-1 flex flex-col rounded overflow-hidden">
                        <div className="flex font-bold bg-black">
                            <StyledCheckbox
                                checked={deletedQns.size > 0 && deletedQns.size === viewQns.size}
                                indeterminate={deletedQns.size > 0 && deletedQns.size < viewQns.size}
                                onChange={toggleAllDeleted}
                            />
                            <div className="flex-[2_2_0%] p-2 tb-border">title</div>
                            <div className="flex-[4_4_0%] p-2 tb-border">body</div>
                            <div className="flex-1 p-2 tb-border">difficulty</div>
                            <div className="flex-[2_2_0%] p-2 tb-border">category</div>
                        </div>
                        {viewQns.size ? [...viewQns.entries()].map(([id, q]) => (
                            <QuestionRow key={id} question={q}
                                initialQuestion={questions.get(id) ?? q}
                                onQuestionChange={(q) => saveUpdated(id, q)}
                                onQuestionDelete={() => saveDeleted(id)}
                                className="bg-[var(--bg-1)] flex font-mono hover:bg-[var(--bg-2)] active:bg-[var(--bg-2)]" checked={deletedQns.has(id)} />
                        )) :
                            <div className="bg-[var(--bg-1)] flex flex-col items-center justify-center gap-4 h-[2.4rem] m-[1px]" ><i className="opacity-30">No items found.</i></div>}
                        <div className="flex-1 flex gap-2 mt-1">
                            <StyledButton onClick={pushNew} style={{ backgroundColor: 'var(--txt-5)' }}>Add Question</StyledButton>
                            <StyledButton disabled={changedQns.size === 0} onClick={pushUpdated} style={{ backgroundColor: 'var(--txt-4)' }}>Save {changedQns.size > 0 ? changedQns.size : ''} Change{changedQns.size === 1 ? '' : 's'}</StyledButton>
                            <StyledButton disabled={deletedQns.size === 0} onClick={pushDeleted} style={{ backgroundColor: 'var(--txt-6)' }}>Delete {deletedQns.size > 0 ? deletedQns.size : ''}</StyledButton>
                            <div className="flex-[5_5_0%]" />
                            <StyledButton disabled={changedQns.size === 0} onClick={clearUpdated}>Discard Changes</StyledButton>
                        </div>
                    </div>
                </div>
            </main >
        </>
    );
}
