import type { Update } from '@codemirror/collab';
import { ChangeSet, Text as CMText } from '@uiw/react-codemirror';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { api } from '~/utils/api';

export default function useCodeSession(codeSessionId: string): [CMText, (v: { changes: ChangeSet }) => void, loadedCode: boolean] {
    const { data } = useSession();
    const [code, setCode] = useState<CMText>(CMText.of(['']));
    const [loadedCode, setLoadedCode] = useState(false);
    const [clientId, setClientId] = useState('');
    const deleteClientIdQuery = api.codeSession.deleteClientId.useQuery({ clientId }, { enabled: false });
    const clientIdQuery = api.codeSession.getClientId.useQuery(undefined, { enabled: false });
    
    const updateSession = api.codeSession.updateSession.useMutation();
    const codeSessionQuery = api.codeSession.getSession.useQuery({
        codeSession: codeSessionId,
    }, { enabled: data != null && !loadedCode });
    api.codeSession.suscribeToSession.useSubscription({ codeSessionId }, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onData(update: { clientId: string, changes: any }) {
            if (update.clientId == clientId) {
                return;
            }
            const changes = ChangeSet.fromJSON(update.changes);
            setCode(changes.apply(code));
        },
        async onError() {
            await deleteClientIdQuery.refetch();
        }
    });
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
        if (loadedCode) return;
        const text = CMText.of(codeSessionQuery.data.code.split("\n"));
        setCode(text);
        
        setLoadedCode(true);
        
    }, [data, codeSessionQuery]);    


    const updateCode = (update: { changes: ChangeSet }) => {
        
        if (!loadedCode) return;
        const new_text = update.changes.apply(code);
        setCode(new_text);
        updateSession.mutate({
            update: {
                clientId: clientId,
                changes: JSON.stringify(update.changes.toJSON())
            },
            codeSessionId
        });
    };
    return [code, updateCode, loadedCode];
}