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
      interceptCallback: phase => async (req, res) => {
        if (phase === 'response' && res?._data?.headers?.['content-type'] == 'video/mp4') {
          const fixUrl = {}
          if(req.fullUrl().includes("video.qq.com")){
            fixUrl.fixUrl = req.fullUrl().replace(/\/20302\//g, '/20304/');
            fixUrl.hdUrl = fixUrl.fixUrl.replace(/(\?|&)(?!(encfilekey=|token=))[^&]+/g, '');
          }

          win?.webContents?.send?.('VIDEO_CAPTURE', {
            url: req.fullUrl(),
            size: res?._data?.headers?.['content-length'] ?? 0,
            ...fixUrl
          });
        }
      },
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

  ipcMain.handle('invoke_下载视频', async (event, { url, savePath }) => {
    return downloadFile(
      url,
      `${savePath}/${Date.now()}.mp4`,
      throttle(value => win?.webContents?.send?.('e_进度变化', value), 1000),
    ).catch(err => {
      console;
    });
  });
}

export function setWin(w) {
  win = w;
}
