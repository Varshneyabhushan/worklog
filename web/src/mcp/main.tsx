import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../shared/tokens.css";
import "./mcp.css";
import { TodayView } from "./TodayView";

createRoot(document.getElementById("root")!).render(
   <StrictMode>
      <TodayView />
   </StrictMode>,
);
