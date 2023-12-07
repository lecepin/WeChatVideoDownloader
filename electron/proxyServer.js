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

const WVDS_DEBUG = process.env.WVDS_DEBUG !== undefined;

const injection_html = `
<script type="text/javascript" src="//res.wx.qq.com/t/wx_fed/finder/web/web-finder/res/js/wvds.inject.js"></script>
`;

// setTimeout to allow working in macOS
// in windows: H5ExtTransfer:ok
// in macOS: finderH5ExtTransfer:ok
const injection_script = `
setTimeout(() => {
  if (window.wvds !== undefined) return;
  ${
    WVDS_DEBUG
      ? `
  document.body.style.border = "2px solid #0000FF";
  let ele_app = document.getElementById("app");
  let ele_btn1 = document.createElement("a");
  let ele_btn2 = document.createElement("a");
  let ele_debug = document.createElement("textarea");
  `
      : ''
  }
  function debug_wvds(msg) {
    ${WVDS_DEBUG ? `ele_debug.value += "\\n" + msg;` : ''}
  }

  ${
    WVDS_DEBUG
      ? `
  ele_btn1.style = "position:absolute;top:3px;left:20px;width:80px;height:30px;cursor:pointer;";
  ele_btn1.text = "Source";
  ele_btn1.onclick = () => {
    var source = "<html>";
    source += document.getElementsByTagName('html')[0].innerHTML;
    source += "</html>";
    debug_wvds(source);
  };
  ele_app.appendChild(ele_btn1);

  ele_btn2.style = "position:absolute;top:3px;left:120px;width:80px;height:30px;cursor:pointer;";
  ele_btn2.text = "Test";
  ele_btn2.onclick = () => {
    debug_wvds("Hello WeChatVideo Downloader!");
  };
  ele_app.appendChild(ele_btn2);

  ele_debug.setAttribute("rows", "60");
  ele_debug.setAttribute("cols", "60");
  ele_debug.style = "position:absolute;top:600px;left:20px;width:600px;height:300px;border:2px solid #FF00FF;";
  ele_debug.value = "Debug:\\n";
  ele_app.appendChild(ele_debug);
  `
      : ''
  }
  let receiver_url = "https://aaaa.com";

  function send_response_if_is_video(response) {
    if (response == undefined) return;
    // debug_wvds(JSON.stringify(response));
    debug_wvds("send 1: " + response["err_msg"]);
    if (!response["err_msg"].includes("H5ExtTransfer:ok")) return;
    let value = JSON.parse(response["jsapi_resp"]["resp_json"]);
    // debug_wvds("send 2: " + JSON.stringify(value));
    if (value["object"] == undefined || value["object"]["object_desc"] == undefined  || value["object"]["object_desc"]["media"].length == 0) {
      return;
    }
    let media = value["object"]["object_desc"]["media"][0];
    // debug_wvds("send 3: " + JSON.stringify(media));
    let description = value["object"]["object_desc"]["description"].trim();
    debug_wvds("send x decode key: " + media["decode_key"] + " for " + description);
    let video_data = {
      "decode_key": media["decode_key"],
      "url": media["url"]+media["url_token"],
      "size": media["file_size"],
      "description":  description,
      "uploader": value["object"]["nickname"]
    };
    fetch(receiver_url, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(video_data),
    }).then((resp) => {
      debug_wvds(\`video data for \${video_data["description"]} sent!\`);
    });
  }

  function wrapper(name,origin) {
    return function() {
      let cmdName = arguments[0];
      if (arguments.length == 3) {
        let original_callback = arguments[2];
        arguments[2] = async function () {
          if (arguments.length == 1) {
            debug_wvds("wrapper 3: " + JSON.stringify(arguments[0]));
            send_response_if_is_video(arguments[0]);
          }
          return await original_callback.apply(this, arguments);
        }
        debug_wvds("wrapper 1: " + cmdName + ", " + typeof(arguments[1]) + ", " + typeof(arguments[2]));
      } else {
        debug_wvds("wrapper 2: " + cmdName + ", " + arguments.length + ", " + arguments[1] + ", " + typeof(arguments[2]));
      }
      let result = origin.apply(this,arguments);
      return result;
    }
  }
  window.WeixinJSBridge.invoke = wrapper("WeixinJSBridge.invoke", window.WeixinJSBridge.invoke);
  window.wvds = true;
  debug_wvds("Invoke WechatVideoDownloader Service!");
}, 1000);`;

export async function startServer({ win, setProxyErrorCallback = f => f }) {
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
        as: 'json',
      },
      (req, res) => {
        console.log('request(aaaa.com):', req.json);
        res.string = 'ok';
        res.statusCode = 200;
        win?.webContents?.send?.('VIDEO_CAPTURE', req.json);
      },
    );

    proxy.intercept(
      {
        phase: 'response',
        hostname: 'channels.weixin.qq.com',
        as: 'string',
      },
      async (req, res) => {
        if (req.url.includes('/web/pages/feed')) {
          res.string = res.string.replace('</body>', injection_html + '\n</body>');
          res.statusCode = 200;
          console.log('inject[channels.weixin.qq.com]:', req.url, res.string.length);
        }
      },
    );

    proxy.intercept(
      {
        phase: 'response',
        hostname: 'res.wx.qq.com',
        as: 'string',
      },
      async (req, res) => {
        if (req.url.includes('wvds.inject.js')) {
          console.log('inject[res.wx.qq.com]:', req.url, res.string.length);
          res.string = injection_script;
          res.statusCode = 200;
        }
      },
    );

    proxy.intercept(
      {
        phase: 'response',
        hostname: 'res.wx.qq.com',
        as: 'string',
      },
      async (req, res) => {
        if (req.url.includes('polyfills.publish')) {
          res.string = res.string + '\n' + injection_script;
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
