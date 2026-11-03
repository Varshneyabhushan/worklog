import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Notice {
   text: string;
   isError: boolean;
}

const NoticeContext = createContext<(notice: Notice) => void>(() => {});

export function NoticeProvider({ children }: { children: ReactNode }) {
   const [notice, setNotice] = useState<Notice | null>(null);
   const show = useCallback((next: Notice) => {
      setNotice(next);
      window.setTimeout(() => setNotice((current) => (current === next ? null : current)), 5000);
   }, []);
   return (
      <NoticeContext.Provider value={show}>
         {children}
         <div className="notice-area" role="status" aria-live="polite">
            {notice && (
               <div className={`notice${notice.isError ? " error" : ""}`}>{notice.text}</div>
            )}
         </div>
      </NoticeContext.Provider>
   );
}

/** Runs a change against the service, reports a refusal, and refreshes every view. */
export function useAction() {
   const show = useContext(NoticeContext);
   const queries = useQueryClient();
   return useCallback(
      async (change: () => Promise<unknown>, done?: string): Promise<boolean> => {
         try {
            await change();
            if (done) show({ text: done, isError: false });
            return true;
         } catch (err) {
            show({ text: err instanceof Error ? err.message : String(err), isError: true });
            return false;
         } finally {
            void queries.invalidateQueries();
         }
      },
      [show, queries],
   );
}
