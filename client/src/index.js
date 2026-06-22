// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { StoreProvider } from "./context/StoreContext"; // ← add this
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <CartProvider>
      <StoreProvider>
        {" "}
        {/* ← wrap App with it */}
        <App />
      </StoreProvider>
    </CartProvider>
  </React.StrictMode>,
);

serviceWorkerRegistration.register();
