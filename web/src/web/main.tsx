import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../shared/tokens.css";
import "./web.css";
import { App } from "./App";
import { NoticeProvider } from "./actions";

const queries = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

createRoot(document.getElementById("root")!).render(
   <StrictMode>
      <QueryClientProvider client={queries}>
         <NoticeProvider>
            <App />
         </NoticeProvider>
      </QueryClientProvider>
   </StrictMode>,
);
