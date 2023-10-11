import { useRouter } from 'next/router';
import { WithAuthWrapper } from '~/components/wrapper/AuthWrapper';
import useCodeSession from '~/hooks/useCodeSession';
import CodeMirror, { EditorState, ViewUpdate } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useEffect, useState } from 'react';
import { protectedProcedure } from '~/server/api/trpc';
import { api } from '~/utils/api';
import useDebounce from '~/hooks/useDebounce';

function Editor() {
    const router = useRouter();
    const [code, setCode, loadedCode] = useCodeSession(router.query.id as string);
    const [editorState, setEditorState] = useState<EditorState>(EditorState.create());
    
    const [saving, setSaving] = useState(false);
    const saveCodeSession = api.codeSession.saveSession.useQuery({ codeSessionId: router.query.id as string }, { enabled: saving });

    useEffect(() => {
        const editor = EditorState.create({
            doc: code
        });
        setEditorState(editor);
    }, [loadedCode]);

    useEffect(() => {
        setSaving(false);
    }, [saveCodeSession])
    if (!loadedCode) {
        return <>Loading</>;
    }
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 's' && !saving) {
            // Prevent the Save dialog to open
            e.preventDefault();
            setSaving(true);
        }
        });

    return (
        <div >
            
            <CodeMirror onChange={(_, viewUpdate) => setCode({
                changes: viewUpdate.changes
            })}
                value={code.toString()}
                extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]} />
        </div>);
};


export default WithAuthWrapper(Editor);