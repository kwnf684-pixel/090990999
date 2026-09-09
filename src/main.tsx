import LocalAccess from './components/LocalAccess';
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/noto-sans-arabic";
import "./styles.css";
import App from "./app/App";
import InstallPrompt from './components/InstallPrompt';
import './components/premium/premium.css';
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <LocalAccess><App />
      <InstallPrompt /></LocalAccess>
    </BrowserRouter>
  </React.StrictMode>,
);


