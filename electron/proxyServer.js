import fs from 'fs';
import hoxy from 'hoxy';
import getPort from 'get-port';
import { app } from 'electron';
import CONFIG from './const';
import { setProxy, closeProxy } from './setProxy';

export async function startServer({
  interceptCallback = f => f => f,
  setProxyErrorCallback = f => f,
}) {
  const port = await getPort();

  return new Promise(async (resolve, reject) => {
    const proxy = hoxy
      .createServer({
        certAuthority: {
          key: fs.readFileSync(CONFIG.CERT_PRIVATE_PATH),
          cert: fs.readFileSync(CONFIG.CERT_PUBLIC_PATH),
        },
      })
      .listen(port, () => {
        setProxy('127.0.0.1', port)
          .then(() => resolve())
          .catch(() => {
            setProxyErrorCallback(data);
            reject('设置代理失败');
          });
      });

    proxy.intercept(
      {
        phase: 'request',
      },
      interceptCallback('request'),
    );

    proxy.intercept(
      {
        phase: 'response',
      },
      interceptCallback('response'),
    );
  });
}

app.on('before-quit', async e => {
  e.preventDefault();
  try {
    await closeProxy();
    console.log('close proxy success');
  } catch (error) {}

  app.exit();
});
