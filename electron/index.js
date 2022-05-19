import { app, BrowserWindow } from "electron";
import log from "electron-log";
import CONFIG from "./const";
import { checkUpdate } from "./utils";

app.commandLine.appendSwitch("--no-proxy-server");

function createWindow() {
  // electron.Menu.setApplicationMenu(null);
  checkUpdate(
    "https://cdn.jsdelivr.net/gh/lecepin/electron-react-tpl/package.json",
    "https://github.com/lecepin/electron-react-tpl/releases"
  );

  mainWindow = new BrowserWindow({
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

  mainWindow.loadURL(CONFIG.APP_START_URL);
  CONFIG.IS_DEV && mainWindow.webContents.openDevTools();

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
