import { get } from "axios";
const { app, dialog, shell } = require("electron");
import semver from "semver";

// packageUrl 需要包含 { "version": "1.0.0" } 结构
function checkUpdate(
  // 可以使用加速地址 https://cdn.jsdelivr.net/gh/lecepin/electron-react-tpl/package.json
  packageUrl = "https://raw.githubusercontent.com/lecepin/electron-react-tpl/master/package.json",
  downloadUrl = "https://github.com/lecepin/electron-react-tpl/releases"
) {
  get(packageUrl)
    .then(({ data }) => {
      if (semver.gt(data?.version, app.getVersion())) {
        const result = dialog.showMessageBoxSync({
          message: "发现新版本，是否更新？",
          type: "question",
          cancelId: 1,
          defaultId: 0,
          buttons: ["进入新版本下载页面", "取消"],
        });

        if (result === 0 && downloadUrl) {
          shell.openExternal(downloadUrl);
        }
      }
    })
    .catch((err) => {});
}

export { checkUpdate };
