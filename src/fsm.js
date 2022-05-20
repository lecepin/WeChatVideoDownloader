import { createMachine } from 'xstate';
import { ipcRenderer } from 'electron';

export default createMachine(
  {
    id: '微信视频号下载工具',
    context: {},
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
        on: {
          e_视频捕获: {
            actions: 'action_视频捕获',
          },
        },
        states: {
          空闲: {
            on: {
              e_下载: {
                target: '下载',
              },
              e_预览: {
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
                  e_确认位置: { target: '下载中' },
                  e_取消: { target: '#初始化完成.空闲' },
                },
              },
              下载中: {
                on: {
                  e_进度变化: {
                    actions: 'action_进度变化',
                  },
                  e_下载完成: {
                    target: '下载完成',
                  },
                  e_下载失败: {
                    target: '#初始化完成.空闲',
                    actions: 'action_下载失败',
                  },
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
    },
  },
  {
    services: {
      invoke_初始化信息: (context, event) => send => {},
      invoke_开始初始化: (context, event) => send => {},
    },
    actions: {
      action_视频捕获: (context, event) => {},
      action_改变规则: (context, event) => {},
      action_进度变化: (context, event) => {},
      action_下载失败: (context, event) => {},
      action_打开文件位置: (context, event) => {},
    },
  },
);
