import { createRoot } from "react-dom/client";
import App from "./App.tsx";

import "./index.css";

// @ts-ignore: virtual module provided by Vite PWA plugin at build time
import { registerSW } from 'virtual:pwa-register';

registerSW();


