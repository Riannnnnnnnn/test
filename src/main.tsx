import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { ContentProvider } from "@/content/ContentContext";
import "@/styles/global.css";
import "@/styles/mobile.css";

createRoot(document.getElementById("root")!).render(<StrictMode><ContentProvider><App /></ContentProvider></StrictMode>);
