/**
 * Page used to add test cases
 */

import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import QuestionView from "~/components/QuestionView";
import { StyledButton } from "~/components/StyledButton";
import { StyledTextarea } from "~/components/StyledInput";
import QuestionToggleModal from "~/components/code/QuestionToggleModal";
import { WithAuthWrapper } from "~/components/wrapper/AuthWrapper";
import useQuestions from "~/hooks/useQuestions";
import {
  Language,
  ModifyQuestionProps,
  ModifyTestCaseProps,
} from "~/types/global";
import { api } from "~/utils/api";
import { getLanguage } from "~/utils/utils";

// todo: toolbar for options
const Toolbar = ({
  judgeLanguages,
  currentLanguage,
  setCurrentLanguage,
  modifyQuestionProps,
  onUpdate,
  deleteEnv,
  canDelete
}: {
  judgeLanguages: Language[];
  currentLanguage: number;
  setCurrentLanguage: (language: Language) => void;
  modifyQuestionProps: ModifyQuestionProps;
  onUpdate: () => void;
  deleteEnv: () => void;
  canDelete: boolean;
}) => {
  return (
    <div className="bg-slate-900 overflow-x-auto overflow-y-clip text-white items-center p-3 grid grid-cols-9 gap-x-5">
      <label className="flex flex-row col-span-2">
        Language&nbsp;
        <select
          name="language"
          id="language"
          value={currentLanguage}
          onChange={(e) => {
            const lang = judgeLanguages.find((l) => l.id === parseInt(e.target.value ));
            lang && setCurrentLanguage(lang);
          }}
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          required
        >
          {judgeLanguages.map((language, i) => (
            <option key={language.id} value={language.id}>
              {language.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-row col-span-2">
      <label className="flex flex-row col-span-2">
        <QuestionToggleModal questionTitleList={modifyQuestionProps.questionTitleList} setQuestionId={modifyQuestionProps.setQuestionId} />
      </label>
      </label>
      <div className="flex flex-row col-span-2 gap-2">
        <StyledButton onClick={onUpdate}>Upsert env</StyledButton>
        <StyledButton onClick={deleteEnv} disabled={!canDelete}>Delete env</StyledButton>
      </div>
    </div>
  );
};

type FormState = {
    template: string;
    prepend: string;
    append: string;
    languageId: number;
};

const emptyFormState: FormState = {
    template: "",
    prepend: "",
    append: "",
    languageId: 0,
};

// maintainer route to add and delete test cases
const CreateEnvironment = () => {
  const useQuestionObject = useQuestions();
  const { data: session } = useSession();
  
  const router = useRouter();
  const isMaintainer = session?.user.role === "MAINTAINER";
  useEffect(() => {
    if (session && !isMaintainer) {
      void router.push("/");
    }
  }, [router]);
  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const languages = api.judge.getLanguages.useQuery();

  const setFormDataWrapper = (item: Partial<FormState>) => {
    setFormData((prev) => ({
      ...prev,
      ...item,
    }));
  };


  useEffect(() => {
    useQuestionObject.currentLanguage && setFormDataWrapper({ languageId: useQuestionObject.currentLanguage.id });
  }, [useQuestionObject.currentLanguage]);
  const updateEnvMutation = api.environment.upsertEnvironment.useMutation(
    {
        onError() {
            toast.error("Failed to update")
        }
    }
  );
  const deleteEnvMutation = api.environment.deleteEnvironment.useMutation(
    {
        onError() {
            toast.error("Failed to delete")
        }
    }
  );

  function inEnvironments(languageId: number) {
    if (useQuestionObject.languages.length === 0) {
        return false;
    }
    return useQuestionObject.languages.find((lang) => {
        return lang.id === languageId
    }) !== undefined;
  }


  function updateEnv() {
    if (!useQuestionObject.currentQuestion) {
        toast.error("No question selected");
        return;
    };
    updateEnvMutation.mutate({
        ...formData,
        questionId: useQuestionObject.currentQuestion?.id
    });
  }

  function deleteEnv() {
    
    deleteEnvMutation.mutate({
        id: useQuestionObject.environmentId
    })
  }


  useEffect(() => {
    if (useQuestionObject.environment) {
        setFormData({
            ...useQuestionObject.environment,
        });
    }
  }, [useQuestionObject.environment])

  
  // update the language in useQuestions if it is valid
  useEffect(() => {
    if (inEnvironments(formData.languageId)) {
        useQuestionObject.setCurrentLanguage(useQuestionObject.languages
            .find((val) => val.id === formData.languageId)!)
        return;
    }
    if (useQuestionObject.languages.length === 0) return;
    const { languageId, ...withoutLang } = emptyFormState;
    setFormDataWrapper(withoutLang);

  }, [formData.languageId, useQuestionObject.languages, useQuestionObject.environment])

  return (
    <div className="flex flex-col bg-slate-600 h-screen text-white">
      <Toolbar
        judgeLanguages={languages.data ?? []}
        currentLanguage={formData.languageId}
        setCurrentLanguage={(lang) => setFormDataWrapper({ languageId: lang.id })}
        modifyQuestionProps={{
          questionTitleList: useQuestionObject.questionTitleList,
          setQuestionId: useQuestionObject.setQuestionId,
          currentQuestion: useQuestionObject.currentQuestion,
        }}
        deleteEnv={deleteEnv}
        onUpdate={updateEnv}
        canDelete={inEnvironments(formData.languageId)}
      />
      <div className="grid grid-cols-2 h-screen overflow-auto">
        <QuestionView
          question={useQuestionObject.currentQuestion}
          template={useQuestionObject.template}
          language={
            getLanguage(useQuestionObject.currentLanguage?.name ?? "") ?? "c"
          }
          className="w-full m-3 col-span-1 flex flex-col"
        />
        <div className="overflow-auto col-span-1 flex flex-col bg-slate-800 text-white p-8 w-full h-full">
        <label>
            Prepend
            <ReactCodeMirror
              theme="dark"
              value={formData.prepend}
              onChange={(value) => {
                setFormDataWrapper({ prepend: value });
              }}
              extensions={[
                loadLanguage(
                  getLanguage(useQuestionObject.currentLanguage?.name ?? "") ??
                    "c",
                )!,
              ]}
            />
          </label>
          <label>
            Append
            <ReactCodeMirror
              theme="dark"
              value={formData.append}
              onChange={(value) => {
                setFormDataWrapper({ append: value });
              }}
              extensions={[
                loadLanguage(
                  getLanguage(useQuestionObject.currentLanguage?.name ?? "") ??
                    "c",
                )!,
              ]}
            />
          </label>
          <label>
            Template
            <ReactCodeMirror
              theme="dark"
              value={formData.template}
              onChange={(value) => {
                setFormDataWrapper({ template: value });
              }}
              extensions={[
                loadLanguage(
                  getLanguage(useQuestionObject.currentLanguage?.name ?? "") ??
                    "c",
                )!,
              ]}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default WithAuthWrapper(CreateEnvironment, true);
