import { useMachine } from '@xstate/react';
import { Table, Button, Progress, Alert } from 'antd';
import { shell } from 'electron';
import {
  DownloadOutlined,
  PlaySquareOutlined,
  ClearOutlined,
  GithubOutlined,
  EyeOutlined,
  FormatPainterOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import fsm from './fsm';

import './App.less';
function App() {
  const [state, send] = useMachine(fsm);
  const { captureList, currentUrl, downloadProgress } = state.context;

  return (
    <div className="App">
      {state.matches('检测初始化') ? <div>检测中……</div> : null}
      {state.matches('初始化完成') ? (
        <div className="App-inited">
          <Button
            className="App-inited-clear"
            icon={<ClearOutlined />}
            onClick={() => send('e_清空捕获记录')}
          >
            清空
          </Button>
          <Button
            className="App-inited-github"
            icon={<GithubOutlined />}
            onClick={() => shell.openExternal('https://github.com/lecepin/WeChatVideoDownloader')}
            type="primary"
            ghost
          >
            Star
          </Button>
          <Table
            sticky
            dataSource={captureList}
            columns={[
              {
                title: '视频标题（捕获中……）',
                dataIndex: 'description',
                key: 'description',
                render: value => value,
                ellipsis: true,
              },
              {
                title: '大小',
                dataIndex: 'prettySize',
                key: 'prettySize',
                width: '100px',
                render: value => value,
              },
              {
                title: '操作',
                dataIndex: 'action',
                key: 'action',
                width: '210px',
                render: (_, { url, decodeKey, hdUrl, fixUrl, description, fullFileName }) => (
                  <div>
                    {fullFileName ? (
                      <Button
                        icon={<EyeOutlined />}
                        type="primary"
                        onClick={() => {
                          shell.openPath(fullFileName);
                        }}
                        size="small"
                        ghost
                      >
                        查看
                      </Button>
                    ) : (
                      <Button
                        icon={<DownloadOutlined />}
                        type="primary"
                        onClick={() => {
                          send({
                            type: 'e_下载',
                            url: hdUrl || url,
                            decodeKey: decodeKey,
                            description: description,
                          });
                        }}
                        size="small"
                      >
                        解密下载
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            pagination={{ position: ['none', 'none'] }}
          ></Table>

          {state.matches('初始化完成.预览') ? (
            <div
              className="App-inited-preview"
              onClick={e => {
                e.target == e.currentTarget && send('e_关闭');
              }}
            >
              <video src={currentUrl} controls autoPlay></video>
            </div>
          ) : null}

          {state.matches('初始化完成.下载.下载中') ? (
            <div className="App-inited-download">
              <Progress type="circle" percent={downloadProgress} />
            </div>
          ) : null}
        </div>
      ) : null}
      {state.matches('未初始化') ? (
        <div className="App-uninit">
          <Alert message="首次进入，请先初始化~" type="warning" showIcon closable={false} />
          <Button
            size="large"
            onClick={() => send('e_开始初始化')}
            type="primary"
            icon={<FormatPainterOutlined />}
          >
            初始化
          </Button>
          &nbsp;&nbsp;
          <Button size="large" onClick={() => send('e_重新检测')} icon={<RedoOutlined />}>
            重新检测
          </Button>
        </div>
      ) : null}
      {state.matches('开启服务失败') ? (
        <div className="App-uninit">
          <Alert message="开启服务失败，请允许开启" type="error" showIcon closable={false} />
          <Button size="large" onClick={() => send('e_重试')} type="primary">
            尝试开启
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default App;
