import { useMachine } from '@xstate/react';
import fsm from './fsm';

import './App.less';
function App() {
  const [state, send] = useMachine(fsm);
  const {} = state.context;

  return (
    <div className="App">
      {state.matches('检测初始化') ? <div>检测中……</div> : null}
      {state.matches('初始化完成') ? <div>初始化完成</div> : null}
      {state.matches('未初始化') ? (
        <div>
          <p>未初始化</p>
          <button onClick={() => send('e_开始初始化')}>初始化</button>
          <button onClick={() => send('e_重新检测')}>重新检测</button>
        </div>
      ) : null}
    </div>
  );
}

export default App;
