import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { fetchDropdownData } from "./redux/slices/dropdownSlice";
import App from "./App";
import "./styles/global.css";

// Pre-load global dropdown/master data once on app start
store.dispatch(fetchDropdownData());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
