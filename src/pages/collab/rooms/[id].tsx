/**
 * A collab room
 */

import { useRouter } from 'next/router';
import { WithAuthWrapper } from '~/components/wrapper/AuthWrapper';
import useCodeSession from '~/hooks/useCodeSession';
import CodeMirror, { EditorState, ViewUpdate } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useEffect, useState } from 'react';
import { api } from '~/utils/api';
import { LoadingPage } from '~/components/Loading';


const SharedEditor = ({ onSave }: { onSave: (saving: boolean) => void }) => {
    const router = useRouter()
    const roomId = router.query.id;
    const [code, setCode, loadedCode] = useCodeSession(roomId as string);
    const [saving, setSaving] = useState(false);
    const saveCodeSession = api.codeSession.saveSession.useQuery({ codeSessionId: router.query.id as string }, { enabled: saving });
    useEffect(
        () => {
            onSave(saving);
        }, [saving]);
    useEffect(() => {
        setSaving(false);
    }, [saveCodeSession])
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 's' && !saving) {
            // Prevent the Save dialog to open
            e.preventDefault();
            setSaving(true);
        }
    });
    if (!loadedCode) {
        return <LoadingPage />;
    }
    return (
        <div >
            <CodeMirror onChange={(_, viewUpdate) => setCode({
                changes: viewUpdate.changes
            })}
                value={code.toString()}
                extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]} />
        </div>);
}

/**
 * A shared room for a user to use
 * @returns 
 */
const Room = () => {
    const [saving, setSaving] = useState(false);
    return (
        <SharedEditor onSave={setSaving} />
    )
};


export default WithAuthWrapper(Room);

