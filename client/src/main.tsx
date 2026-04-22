

import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import "./index.css";
import "./styles/globals.css";



// @ts-ignore: virtual module provided by Vite PWA plugin at build time
import { registerSW } from 'virtual:pwa-register';

// Avoid stale SW-cached UI after deployments: reload once a new SW is ready.
if (!import.meta.env.DEV) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload();
    },
  });
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "next-themes";
const container = document.getElementById("root");

// TEMP DEBUG HELPERS: detect what blocks clicks globally.
if (typeof document !== "undefined") {
  console.log("main.tsx mounted");
  document.body.style.pointerEvents = "auto";

  // Capture clicks before React, so we can see if an overlay is swallowing them.
  document.addEventListener(
    "pointerdown",
    (e) => {
      const { clientX: x, clientY: y } = e;
      const top = document.elementFromPoint(x, y);
      // eslint-disable-next-line no-console
      console.log("[debug:pointerdown]", { x, y, top });
    },
    { capture: true },
  );
}

if (container) {
  createRoot(container).render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}


