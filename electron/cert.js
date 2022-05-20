import CONFIG from './const';
import mkdirp from 'mkdirp';
import fs from 'fs';
import path from 'path';
import sudo from 'sudo-prompt';
import { clipboard, dialog } from 'electron';

function checkCertInstalled() {
  return fs.existsSync(CONFIG.INSTALL_CERT_FLAG);
}

export async function installCert(checkInstalled = true) {
  if (checkInstalled && checkCertInstalled()) {
    return;
  }

  if (process.platform === 'darwin') {
    return new Promise((resolve, reject) => {
      mkdirp.sync(path.dirname(CONFIG.INSTALL_CERT_FLAG));
      clipboard.writeText(
        `echo "输入本地登录密码" && sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${CONFIG.CERT_PUBLIC_PATH}" &&  touch ${CONFIG.INSTALL_CERT_FLAG} && echo "安装完成"`,
      );
      dialog.showMessageBoxSync({
        type: 'info',
        message: `命令已复制到剪贴板,粘贴命令到终端并运行以安装并信任证书`,
      });

      reject();
    });
  } else {
    return sudo.exec(
      `${CONFIG.WIN_CERT_INSTALL_HELPER} -c -add ${CONFIG.CERT_PUBLIC_PATH} -s root`,
      { name: CONFIG.APP_EN_NAME },
      (error, stdout) => {
        if (error) {
          reject(error);
        }
        resolve(stdout);
      },
    );
  }
}
