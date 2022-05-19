import path from "path";
import isDev from "electron-is-dev";
import url from "url";
import { app } from "electron";

const APP_PATH = app.getAppPath();
// 对于一些 shell 去执行的文件，asar 目录下无法使用。配合 extraResources
const EXECUTABLE_PATH = path.join(
  APP_PATH.indexOf("app.asar") > -1
    ? APP_PATH.substring(0, APP_PATH.indexOf("app.asar"))
    : APP_PATH,
  "public"
);

export default {
  APP_START_URL: isDev
    ? "http://localhost:3000"
    : url.format({
        pathname: path.join(APP_PATH, "./build/index.html"),
        protocol: "file:",
        slashes: true,
      }),
  IS_DEV: isDev,
};
