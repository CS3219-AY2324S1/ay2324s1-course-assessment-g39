import { useRouter } from 'next/router';
import { WithAuthWrapper } from '~/components/wrapper/AuthWrapper';
import useCodeSession from '~/hooks/useCodeSession';
import CodeMirror, { ViewUpdate } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

function Editor() {
    const router = useRouter();
    const [code, setCode] = useCodeSession(router.query.id as string);
    return <CodeMirror value={code} onChange={(val, ViewUpdate) => setCode(val)}
        extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]} />;
};


export default WithAuthWrapper(Editor);