import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { api } from '~/utils/api';
import useDebounce from './useDebounce';

export default function useCodeSession(codeSessionId: string): [string, (v: string) => void] {
    const { data } = useSession();
    const [code, setCode] = useState("");
    const [loadedCode, setLoadedCode] = useState(false);
    const codeSessionQuery = api.codeSession.getSession.useQuery({
        codeSession: codeSessionId,
    }, { enabled: data != null }); 
    const codeSessionSubscription = api.codeSession.suscribeToSession.useSubscription({ codeSessionId });
    
    const [modified, setModified] = useState(false);
    useEffect(() => {
 
        if (data == null) return;
        if (!(codeSessionQuery?.data?.code)) return;
        if (loadedCode) return;
        setCode(codeSessionQuery.data.code);
        
        setLoadedCode(true);
        
    }, [data, codeSessionQuery]);    


    const updateSession = api.codeSession.updateSession.useMutation();
    const updateCode = (code: string) => {
        if (!loadedCode) return;
        setModified(true);
        setCode(code);
        updateSession.mutate({
            code: code,
            codeSpaceId: codeSessionQuery.data!.codeSpaceId,
        });
    };
    useEffect(() => {
        if (!codeSessionQuery) return;
        if (!codeSessionQuery.data) return;
        if (!loadedCode) return;

        // updating code 
        updateSession.mutate({
            code: code,
            codeSpaceId: codeSessionQuery.data.codeSpaceId,
        });
    }, [code]);
    return [code, updateCode];
}