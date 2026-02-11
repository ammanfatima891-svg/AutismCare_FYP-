

import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import "./index.css";



// @ts-ignore: virtual module provided by Vite PWA plugin at build time
import { registerSW } from 'virtual:pwa-register';

registerSW();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ThemeProvider } from "next-themes";
const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}


