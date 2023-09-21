import { Session } from 'next-auth';
import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { api } from '~/utils/api';

export default function useCodeSession(): [string, (v: string) => void] {
    const { data } = useSession();
    console.log(data);
    const [code, setCode] = useState("");
    const codeSessionQuery = api.codeSession.createSession.useQuery({
        sessionId: data ? data!.user.id : ""
    }, { enabled: data != null }); 
    const [modified, setModified] = useState(false);
    


    const updateSession = api.codeSession.updateSession.useMutation();
    const updateCode = (code: string) => {
        setModified(true);
        setCode(code);
    };
    useEffect(() => {
        if (!codeSessionQuery) return;
        if (!data) return;
        // updating code 
        updateSession.mutate({
            code,
            codeSpaceId: codeSessionQuery!.data!.codeSpaceId,
        });
    }, [code]);
    return [code, updateCode];
}