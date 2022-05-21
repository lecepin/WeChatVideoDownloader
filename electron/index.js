import { app, BrowserWindow, Menu } from 'electron';
import CONFIG from './const';
import { checkUpdate } from './utils';
import initIPC, { setWin } from './ipc';

app.commandLine.appendSwitch('--no-proxy-server');
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

function createWindow() {
  Menu.setApplicationMenu(null);
  checkUpdate(
    'https://cdn.jsdelivr.net/gh/lecepin/WeChatVideoDownloader/package.json',
    'https://github.com/lecepin/WeChatVideoDownloader/releases',
  );

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    // resizable: false,
    // maximizable: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  setWin(mainWindow);
  mainWindow.loadURL(CONFIG.APP_START_URL);
  CONFIG.IS_DEV && mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  initIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
