import { appRouter } from './api/root';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import http from 'http';
import next from 'next';
import { parse } from 'url';
import ws from 'ws';
import { createWSTRPCContext } from './api/trpc';

const port = parseInt(process.env.PORT ?? '3000', 10);
console.log(port);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
  console.log("Preparing server");
  const server = http.createServer((req, res) => {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto === 'http') {
      // redirect to ssl
      res.writeHead(303, {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        location: `https://` + req.headers.host + (req.headers.url ?? ''),
      });
      res.end();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });
  console.log("Created http server");
  const wss = new ws.Server({ port: 3001 });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const handler = applyWSSHandler({ wss, router: appRouter, createContext: createWSTRPCContext });

  process.on('SIGTERM', () => {
    console.log('SIGTERM');
    handler.broadcastReconnectNotification();
  });
  server.listen(port);

  console.log(
    `> Server listening at http://localhost:${port} as ${
      dev ? 'development' : process.env.NODE_ENV
    }`,
  );
}).catch(e => {
  console.log(e);
});