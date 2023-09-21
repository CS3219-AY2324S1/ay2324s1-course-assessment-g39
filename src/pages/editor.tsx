import CodeMirror, { ViewUpdate } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useEffect, useState } from 'react';


export default function App() {
  const [code, setCode] = useState("");
  // save code
  useEffect(() => {
    console.log(code);
  }, [code])
  return <CodeMirror value={code} onChange={(val, ViewUpdate) => setCode(val)} extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]} />;
}
