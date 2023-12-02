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


const injection_script =`
(function () {
    if (window.wvds !== undefined) {
        return
    }
    let receiver_url = "https://aaaa.com"
    function send_response_if_is_video(response) {
        if (response == undefined) {
            return;
        }
        if (response["err_msg"] != "H5ExtTransfer:ok") {
            return;
        }
        let value = JSON.parse(response["jsapi_resp"]["resp_json"]);
        if (value["object"] == undefined || value["object"]["object_desc"] == undefined  || value["object"]["object_desc"]["media"].length == 0) {
            return
        }
        let media = value["object"]["object_desc"]["media"][0]
        let video_data = {
            "decode_key": media["decode_key"],
            "url": media["url"]+media["url_token"],
            "size": media["file_size"],
            "description":  value["object"]["object_desc"]["description"].trim(),
            "uploader": value["object"]["nickname"]
        }
        fetch(receiver_url, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(video_data),
        }).then((resp) => {
            console.log(\`video data for \${video_data["description"]} sent\`);
        });
    }
    function wrapper(name,origin) {
        console.log(\`injecting \${name}\`);
        return function() {
            let cmdName = arguments[0];
            if (arguments.length == 3) {
                let original_callback = arguments[2];
                arguments[2] = async function () {
                    if (arguments.length == 1) {
                        send_response_if_is_video(arguments[0]);
                    }
                    return await original_callback.apply(this, arguments);
                }
            }
            let result = origin.apply(this,arguments);
            return result;
        }
    }
    console.log(\`------- Invoke WechatVideoDownloader Service ---------\`);
    window.WeixinJSBridge.invoke = wrapper("WeixinJSBridge.invoke",window.WeixinJSBridge.invoke);
    window.wvds = true;
})()
`;


export async function startServer({
  win, 
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
        hostname: 'aaaa.com',
        as: 'json'
      },
      (req, res) => {
        res.string = "ok";
        res.statusCode = 200;
        win?.webContents?.send?.('VIDEO_CAPTURE', req.json)
      },
    );

    proxy.intercept(
      {
        phase: 'response',
        hostname: 'res.wx.qq.com',
        as: "string"
      },
      async (req, res) => {
        if (req.url.includes("polyfills.publish")) {
          res.string = res.string + "\n" + injection_script;
        }
      },
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
