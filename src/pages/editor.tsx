import CodeMirror, { ViewUpdate } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import useCodeSession from '~/hooks/useCodeSession';
import UserDenied from '~/components/UserDenied';


export default function App() {

  const { data } = useSession();
  const [code, setCode] = useCodeSession();
  

  // save code
  useEffect(() => {
    console.log(code);
  }, [code]);
  

  if (!data) {
    return <UserDenied />
  }
   
  return <CodeMirror value={code} onChange={(val, ViewUpdate) => setCode(val)} extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]} />;
}
