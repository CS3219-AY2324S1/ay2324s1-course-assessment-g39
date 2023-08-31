import type { AppType } from 'next/app';
import { trpc } from '../utils/trpc';
import Head from 'next/head';

const MyApp: AppType = ({ Component, pageProps }) => {
  return (<>
    <Head>
      <title>PeerPrep</title>
    </Head>
    <Component {...pageProps} />
  </>);
};

export default trpc.withTRPC(MyApp);
