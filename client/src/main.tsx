

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


