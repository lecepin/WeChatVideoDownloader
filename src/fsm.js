import { createMachine, actions } from 'xstate';
import { ipcRenderer } from 'electron';
import prettyBytes from 'pretty-bytes';
import { uniqBy } from 'lodash';
import { message } from 'antd';

export default createMachine(
  {
    id: '微信视频号下载工具',
    context: {
      captureList: [],
      currentUrl: '',
      savePath: '',
      downloadProgress: 0,
    },
    initial: '检测初始化',
    states: {
      检测初始化: {
        id: '检测初始化',
        invoke: {
          src: 'invoke_初始化信息',
        },
        on: {
          e_初始化完成: {
            target: '初始化完成',
          },
          e_未初始化: {
            target: '未初始化',
          },
        },
      },
      未初始化: {
        initial: '空闲',
        on: {
          e_重新检测: {
            target: '检测初始化',
          },
        },
        states: {
          空闲: {
            on: {
              e_开始初始化: {
                target: '开始初始化',
              },
            },
          },
          开始初始化: {
            invoke: {
              src: 'invoke_开始初始化',
            },
          },
        },
      },

      初始化完成: {
        initial: '空闲',
        id: '初始化完成',
        invoke: {
          src: 'invoke_启动服务',
        },
        on: {
          e_视频捕获: {
            actions: 'action_视频捕获',
          },
          e_开启服务失败: {
            target: '开启服务失败',
          },
          e_清空捕获记录: {
            actions: 'action_清空捕获记录',
          },
        },
        states: {
          空闲: {
            on: {
              e_下载: {
                actions: 'action_设置当前地址',
                target: '下载',
              },
              e_预览: {
                actions: 'action_设置当前地址',
                target: '预览',
              },
              e_改变规则: {
                actions: 'action_改变规则',
              },
            },
          },
          下载: {
            initial: '选择位置',
            states: {
              选择位置: {
                on: {
                  e_确认位置: { actions: 'action_存储下载位置', target: '下载中' },
                  e_取消: { target: '#初始化完成.空闲' },
                },
                invoke: {
                  src: 'invoke_选择下载位置',
                },
              },
              下载中: {
                on: {
                  e_进度变化: {
                    actions: 'action_进度变化',
                  },
                  e_下载完成: {
                    target: '#初始化完成.空闲',
                    actions: 'action_下载完成',
                  },
                  e_下载失败: {
                    target: '#初始化完成.空闲',
                    actions: 'action_下载失败',
                  },
                },
                invoke: {
                  src: 'invoke_下载视频',
                },
              },
              下载完成: {
                on: {
                  e_取消: { target: '#初始化完成.空闲' },
                  e_打开文件位置: {
                    actions: 'action_打开文件位置',
                  },
                },
              },
            },
          },
          预览: {
            on: {
              e_关闭: {
                target: '空闲',
              },
            },
          },
        },
      },
      开启服务失败: {
        on: {
          e_重试: {
            target: '初始化完成',
          },
        },
      },
    },
  },
  {
    services: {
      invoke_初始化信息: () => send => {
        ipcRenderer.invoke('invoke_初始化信息').then(data => {
          if (data === true) {
            send('e_初始化完成');
          } else {
            send('e_未初始化');
          }
        });
      },
      invoke_开始初始化: (context, event) => send => {
        ipcRenderer
          .invoke('invoke_开始初始化')
          .catch(() => {})
          .finally(() => send('e_重新检测'));
      },
      invoke_启动服务: (context, event) => send => {
        const fnDealVideoCapture = (eName, { url, size, description, decode_key, ...other }) => {
          send({ type: 'e_视频捕获', url, size, description, decodeKey: decode_key, ...other });
        };

        ipcRenderer
          .invoke('invoke_启动服务')
          .then(() => {
            ipcRenderer.on('VIDEO_CAPTURE', fnDealVideoCapture);
          })
          .catch(() => {
            send('e_开启服务失败');
          });

        return () => {
          ipcRenderer.removeListener('VIDEO_CAPTURE', fnDealVideoCapture);
        };
      },
      invoke_选择下载位置: (context, event) => send => {
        ipcRenderer
          .invoke('invoke_选择下载位置')
          .then(data => {
            send({
              type: 'e_确认位置',
              data,
            });
          })
          .catch(() => send('e_取消'));
      },
      invoke_下载视频:
        ({ currentUrl, savePath, decodeKey, description }) =>
        send => {
          ipcRenderer
            .invoke('invoke_下载视频', {
              url: currentUrl,
              decodeKey,
              savePath,
              description,
            })
            .then(({ fullFileName }) => {
              send({ type: 'e_下载完成', fullFileName, currentUrl });
            })
            .catch(() => {
              send('e_下载失败');
            });

          ipcRenderer.on('e_进度变化', (event, arg) => {
            send({
              type: 'e_进度变化',
              data: arg,
            });
          });

          return () => {
            ipcRenderer.removeAllListeners('e_进度变化');
          };
        },
    },
    actions: {
      action_视频捕获: actions.assign(
        ({ captureList }, { url, size, description, decodeKey, ...other }) => {
          captureList.push({
            size,
            url,
            prettySize: prettyBytes(+size),
            description,
            decodeKey,
            ...other,
          });

          return {
            captureList: uniqBy(captureList, 'url'),
          };
        },
      ),
      action_清空捕获记录: actions.assign(() => {
        return {
          captureList: [],
        };
      }),
      action_设置当前地址: actions.assign((_, { url, decodeKey, description }) => {
        return {
          currentUrl: url,
          decodeKey: decodeKey,
          description: description,
        };
      }),
      action_存储下载位置: actions.assign((_, { data }) => {
        return {
          savePath: data,
        };
      }),
      action_进度变化: actions.assign((_, { data }) => {
        return {
          downloadProgress: ~~(data * 100),
        };
      }),
      action_下载完成: actions.assign(({ captureList }, { fullFileName, currentUrl }) => {
        return {
          captureList: captureList.map(item => {
            if ((item.hdUrl || item.url) === currentUrl) {
              item.fullFileName = fullFileName;
            }
            return item;
          }),
        };
      }),
      action_下载失败: actions.log(() => {
        message.error('网络错误，请重试');
      }),
    },
  },
);
