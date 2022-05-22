import fs from 'fs';
import hoxy from 'hoxy';
import getPort from 'get-port';
import log from 'electron-log';
import { app } from 'electron';
import CONFIG from './const';
import { setProxy, closeProxy } from './setProxy';

if (process.platform === 'win32') {
  process.env.OPENSSL_BIN = CONFIG.OPEN_SSL_BIN_PATH;
  process.env.OPENSSL_CONF = CONFIG.OPEN_SSL_CNF_PATH;
}

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
      })
      .on('error', err => {
        log.log('proxy err', err);
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
