import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { KEYS, readStored, themeSchema } from "./lib/storage";
import { applyTheme, preferredTheme } from "./theme/themes";
import "./index.css";

// Apply the saved theme before the first paint to avoid a flash of the wrong colours.
applyTheme(readStored(KEYS.theme, themeSchema, preferredTheme()));

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
