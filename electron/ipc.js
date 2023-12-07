import { ipcMain, dialog } from 'electron';
import log from 'electron-log';
import { throttle } from 'lodash';
import { startServer } from './proxyServer';
import { installCert, checkCertInstalled } from './cert';
import { downloadFile } from './utils';

let win;

export default function initIPC() {
  ipcMain.handle('invoke_初始化信息', async (event, arg) => {
    return checkCertInstalled();
  });

  ipcMain.handle('invoke_开始初始化', (event, arg) => {
    return installCert(false);
  });

  ipcMain.handle('invoke_启动服务', async (event, arg) => {
    return startServer({
      win: win,
      setProxyErrorCallback: err => {
        console.log('开启代理失败', err);
      },
    });
  });

  ipcMain.handle('invoke_选择下载位置', async (event, arg) => {
    const result = dialog.showOpenDialogSync({ title: '保存', properties: ['openDirectory'] });

    if (!result?.[0]) {
      throw '取消';
    }

    return result?.[0];
  });

  ipcMain.handle('invoke_下载视频', async (event, { url, decodeKey, savePath, description }) => {
    let fileName = description?.replaceAll?.(/\\|\/|:|\*|\?|"|<|>|\|/g, '') || Date.now();

    console.log('description:', description);
    console.log('fileName:', fileName);
    console.log('url:', url);
    console.log('decodeKey:', decodeKey);

    return downloadFile(
      url,
      decodeKey,
      `${savePath}/${fileName}.mp4`,
      throttle(value => win?.webContents?.send?.('e_进度变化', value), 1000),
    ).catch(err => {
      console;
    });
  });
}

export function setWin(w) {
  win = w;
}
