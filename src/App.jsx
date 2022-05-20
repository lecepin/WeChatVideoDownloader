import { useMachine } from '@xstate/react';
import fsm from './fsm';

import './App.less';

function App() {
  const [state, send] = useMachine(fsm);
  const {} = state.context;

  return <div className="App">App</div>;
}

export default App;
