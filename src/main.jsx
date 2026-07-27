import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// ⚠️ React.StrictMode removed to fix double mount issue
// that causes auth state to hang in development

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);