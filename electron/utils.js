import { get } from 'axios';
import { app, dialog, shell } from 'electron';
import semver from 'semver';
import fs from 'fs';
import {getDecryptionArray} from './decrypt';
import {Transform } from 'stream';

// packageUrl 需要包含 { "version": "1.0.0" } 结构
function checkUpdate(
  // 可以使用加速地址 https://cdn.jsdelivr.net/gh/lecepin/electron-react-tpl/package.json
  packageUrl = 'https://raw.githubusercontent.com/lecepin/electron-react-tpl/master/package.json',
  downloadUrl = 'https://github.com/lecepin/electron-react-tpl/releases',
) {
  get(packageUrl)
    .then(({ data }) => {
      if (semver.gt(data?.version, app.getVersion())) {
        const result = dialog.showMessageBoxSync({
          message: '发现新版本，是否更新？',
          type: 'question',
          cancelId: 1,
          defaultId: 0,
          buttons: ['进入新版本下载页面', '取消'],
        });

        if (result === 0 && downloadUrl) {
          shell.openExternal(downloadUrl);
        }
      }
    })
    .catch(err => {});
}



function xorTransform(decryptionArray) {
  let processedBytes = 0;
  return new Transform({
    transform(chunk, encoding, callback) {
      if (processedBytes < decryptionArray.length) {
        let remaining = Math.min(decryptionArray.length - processedBytes, chunk.length);
        for (let i = 0; i < remaining; i++) {
          chunk[i] = chunk[i] ^ decryptionArray[processedBytes + i];
        }
        processedBytes += remaining;
      }
      this.push(chunk);
      callback();
    }
  });
}

function downloadFile(url,decodeKey, fullFileName, progressCallback) {
  const xorStream = xorTransform(getDecryptionArray(decodeKey));
  return get(url, {
    responseType: 'stream',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    },
  }).then(({ data, headers }) => {
    let currentLen = 0;
    const totalLen = headers['content-length'];

    return new Promise((resolve, reject) => {
      data.on('data', ({ length }) => {
        currentLen += length;
        progressCallback?.(currentLen / totalLen);
      });

      data.on('error', err => reject(err));

      data.pipe(xorStream).pipe(
        fs.createWriteStream(fullFileName).on('finish', () => {
          resolve({
            fullFileName,
            totalLen,
          });
        }),
      );
    });
  });
}

export { checkUpdate, downloadFile };
