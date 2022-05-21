import { ipcMain } from 'electron';
import log from 'electron-log';
import { startServer } from './proxyServer';
import { installCert, checkCertInstalled } from './cert';

export default function initIPC() {
  ipcMain.handle('invoke_初始化信息', async (event, arg) => {
    return checkCertInstalled();
  });

  ipcMain.handle('invoke_开始初始化', (event, arg) => {
    return installCert(false);
  });

  ipcMain.handle('invoke_启动服务', async (event, arg) => {
    console.log('invoke_启动服务');
    return startServer({
      interceptCallback: async req => {
        console.log('=========> intercept', req.url);
      },
      setProxyErrorCallback: err => {
        console.log({ err });
      },
    });
  });
}
