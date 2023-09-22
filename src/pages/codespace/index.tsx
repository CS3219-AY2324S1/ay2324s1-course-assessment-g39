import { useRouter } from "next/router";
import { useState } from "react";
import { StyledInput } from "~/components/StyledInput";
import { WithAuthWrapper } from "~/components/wrapper/AuthWrapper";
import useDebounce from "~/hooks/useDebounce";
import { api } from "~/utils/api";

type CodeRowProps = {
  name: string;
  id: string;
  onChange?: () => void;
};

const InnerButton = ({
  onClick,
  children,
  className,
}: {
  className?: string;
  onClick: () => void;
  children: JSX.Element | string;
}) => (
  <button
    type="button"
    className={
      className
        ? className
        : "mb-2 mr-2 rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
    }
    onClick={onClick}
  >
    {children}
  </button>
);

const CodeRow = ({ name, id, onChange }: CodeRowProps) => {
  const deleteCodeSpaceMutation = api.codeSession.deleteCodeSpace.useMutation();
  const codeSpaceSessionCreator = api.codeSession.createSession.useMutation();
  const router = useRouter();

  async function enterSession() {
    const codeSession = await codeSpaceSessionCreator.mutateAsync({ codeSpaceId: id });
    const location = `/codespace/editor/${codeSession.id}`;
    await router.push(location);
    return;
  }
  return (
    <tr className="border-b bg-white dark:border-gray-700 dark:bg-gray-800">
      <td
        scope="row"
        className="max-w-2 max-h-2 overflow-auto whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white"
      >
        {name}
      </td>
      <td className="px-6 py-4">placeHolder</td>
      <td className="px-6 py-4">Created</td>
      <td className="px-6 py-4">
        <InnerButton
          onClick={() => {
            enterSession().then((sessionId) => {
              return sessionId;
            }).catch(() => {
              return;
            });
          }}
          className="generic-button generic-button--enter-session"
        >Enter</InnerButton>

      </td>

      <td className="px-6 py-4">
        <InnerButton
          onClick={() => {
            deleteCodeSpaceMutation.mutate({ codeSpaceId: id });
            setTimeout(() => onChange && onChange(), 500);
          }}
          className="generic-button generic-button--delete"
        >
          Delete
        </InnerButton>
      </td>
    </tr>
  );
};

const CodeHeader = () => (
  <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
    <tr>
      <th scope="col" className="px-6 py-3">
        Code Space name
      </th>
      <th scope="col" className="px-6 py-3">
        Code
      </th>
      <th scope="col" className="px-6 py-3">
        Last updated
      </th>
      <th scope="col" className="px-6 py-3">
        Enter space
      </th>
      <th scope="col" className="px-6 py-3">
        Delete
      </th>
    </tr>
  </thead>
);

const CodeSpaceButtons = ({ onUpdate }: { onUpdate: () => void }) => {
  const createCodeSpaceMutation = api.codeSession.createCodeSpace.useMutation();
  const [name, setName] = useState("");
  // might be useful to use the same thing for filter or smth
  //   const debouncedName = useDebounce(name, 500);
  return (
    <div className="py-3 px-2 gap-4 flex flex-shrink items-center">
      <div className="flex h-full items-center">
      <StyledInput
        onChange={(e) => {
          setName(e.target.value);
        }}
        value={name}
        style={{
          backgroundColor: '--txt-3',
          height: "100%",
          padding: 5
        }}
        className="bg-white text-black"
      />
      </div>
      <InnerButton
        onClick={() => {
          createCodeSpaceMutation.mutate({ name });
          setName("");
          setTimeout(() => onUpdate(), 500);
        }}
        className="generic-button h-full"
      >
        Create CodeSpace
      </InnerButton>
    </div>
  );
};

const CodeSpace = () => {
  const allSpaces = api.codeSession.getAllSpaces.useQuery();
    
  console.log(allSpaces.data);
  return (
    <div className="absolute w-full h-full">
    <div className="grid w-full h-full grid-rows-6 gap-0 dark:bg-gray-900">
      <div className="codespace-header">
      <h1>Code Space</h1>
      <CodeSpaceButtons onUpdate={() => {
        void allSpaces.refetch();
        return;
      }} />
      </div>
      <div className=" w-full h-full dark:bg-gray-900 flex-grow row-span-5 overflow-auto">
      <table className="table-fixed w-full text-left text-sm text-gray-500 dark:text-gray-400">
        <CodeHeader />
        <tbody>
          {allSpaces.data?.map((data) => <CodeRow key={data.id} onChange={() => {
            void allSpaces.refetch();
            return;
          }} {...data} />)}
        </tbody>
      </table>
      </div>
    </div>
    </div>
  );
};

export default WithAuthWrapper(CodeSpace);
