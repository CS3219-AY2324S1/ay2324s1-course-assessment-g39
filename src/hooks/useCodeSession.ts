import type { Update } from "@codemirror/collab";
import { ChangeSet, Text as CMText } from "@uiw/react-codemirror";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import toast, { useToasterStore } from "react-hot-toast";
import { api } from "~/utils/api";

export type CodeSessionResult = [
  CMText,
  (v: { changes: ChangeSet }) => void,
  loadedCode: boolean,
];

export default function useCodeSession(
  codeSessionId: string,
): CodeSessionResult {
  const { data } = useSession();
  const [code, setCode] = useState<CMText>(CMText.of([""]));
  const [loadedCode, setLoadedCode] = useState(false);
  const [clientId, setClientId] = useState("");
  const clientIdQuery = api.codeSession.getClientId.useQuery(undefined, {
    enabled: false,
  });

  const { toasts } = useToasterStore();

  const TOAST_LIMIT = 3
  
  useEffect(() => {
    toasts
      .filter((t) => t.visible) // Only consider visible toasts
      .filter((_, i) => i >= TOAST_LIMIT) // Is toast index over limit?
      .forEach((t) => toast.dismiss(t.id)); // Dismiss – Use toast.remove(t.id) for no exit animation
  }, [toasts]);

  const codeSessionQuery = api.codeSession.getSession.useQuery(
    {
      codeSession: codeSessionId,
    },
    {
      enabled: data != null,
      onError(data) {
        toast.error(
          "Failed to fetch session. If using shared session, only one shared session can be used at a time per user.",
        );
      },
    },
  );

  
  const updateSession = api.codeSession.updateSession.useMutation({
    onError(data) {
        toast.error(
            "Failed to update session"
        );
        void codeSessionQuery.refetch();
    }
  });
  api.codeSession.suscribeToSession.useSubscription(
    { codeSessionId },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onData(update: { clientId: string; changes: any }) {
        if (update.clientId == clientId) {
          return;
        }
        const changes = ChangeSet.fromJSON(update.changes);
        try {
          const newCode = changes.apply(code);
          setCode(newCode);
        } catch (e) {
          // removed error prompt cause can lead to spam
          // toast.error("Refetching, code out of sync. Try refreshing if problem persists");
          void codeSessionQuery.refetch();
        }
      }
    },
  );
  useEffect(() => {
    async function updateClientId() {
      const result = await clientIdQuery.refetch();
      if (!result) return;
      setClientId(result.data!.clientId);
    }
    void updateClientId();
  }, []);

  useEffect(() => {
    if (data == null) return;

    if (!(codeSessionQuery?.data?.code != undefined)) return;
    const text = CMText.of(codeSessionQuery.data.code.split("\n"));
    setCode(text);

    setLoadedCode(true);
  }, [data, codeSessionQuery.data?.code]);

  const updateCode = (update: { changes: ChangeSet }) => {
    if (!loadedCode) return;
    const newCode = update.changes.apply(code);
    setCode(newCode);
    updateSession.mutate({
      update: {
        clientId: clientId,
        changes: JSON.stringify(update.changes.toJSON()),
      },
      codeSessionId,
    });
  };
  return [code, updateCode, loadedCode];
}
