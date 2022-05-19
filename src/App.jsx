import logo from "./logo.png";
import { shell } from "electron";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          onClick={(e) => {
            e.preventDefault();
            shell.openExternal("https://github.com/lecepin/electron-react-tpl");
          }}
          className="App-link"
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Github
        </a>
      </header>
    </div>
  );
}

export default App;
