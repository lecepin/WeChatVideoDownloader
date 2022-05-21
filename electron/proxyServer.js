import fs from 'fs';
import hoxy from 'hoxy';
import getPort from 'get-port';
import { app } from 'electron';
import CONFIG from './const';
import { setProxy, closeProxy } from './setProxy';

export async function startServer({ interceptCallback = f => f, setProxyErrorCallback = f => f }) {
  const port = await getPort();
  const proxy = hoxy
    .createServer({
      certAuthority: {
        key: fs.readFileSync(CONFIG.CERT_PRIVATE_PATH),
        cert: fs.readFileSync(CONFIG.CERT_PUBLIC_PATH),
      },
    })
    .listen(port, () => {
      setProxy('127.0.0.1', port).catch(setProxyErrorCallback);
    })
    .on('error', e => {
      console.log('proxy lib error', e);
    });

  proxy.intercept(
    {
      phase: 'request',
    },
    interceptCallback,
  );
}

app.on('before-quit', async e => {
  e.preventDefault();
  try {
    await closeProxy();
  } catch (error) {}

  app.exit();
});
