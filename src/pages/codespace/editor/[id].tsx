import { useRouter } from 'next/router';
import { WithAuthWrapper } from '~/components/wrapper/AuthWrapper';
import useCodeSession from '~/hooks/useCodeSession';
import CodeMirror, { EditorState, ViewUpdate } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useEffect, useState } from 'react';

function Editor() {
    const router = useRouter();
    const [code, setCode, loadedCode] = useCodeSession(router.query.id as string);
    const [editorState, setEditorState] = useState<EditorState>(EditorState.create());
    useEffect(() => {
        const editor = EditorState.create({
            doc: code
        });
        setEditorState(editor);
    }, [loadedCode]);

    if (!loadedCode) {
        return <>Loading</>;
    }
    return <CodeMirror onChange={(_, viewUpdate) => setCode({
            changes: viewUpdate.changes
        })}
        value={code.toString()}
        extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]} />;
};


export default WithAuthWrapper(Editor);