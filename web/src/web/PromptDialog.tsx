import { useEffect, useRef, useState } from "react";

export interface PromptRequest {
   title: string;
   label: string;
   confirm: string;
   required: boolean;
   onSubmit: (text: string) => void;
}

export function PromptDialog({
   request,
   onClose,
}: {
   request: PromptRequest | null;
   onClose: () => void;
}) {
   const dialog = useRef<HTMLDialogElement>(null);
   const [text, setText] = useState("");

   useEffect(() => {
      if (request) {
         setText("");
         dialog.current?.showModal();
      } else {
         dialog.current?.close();
      }
   }, [request]);

   return (
      <dialog ref={dialog} className="prompt" onClose={onClose}>
         {request && (
            <form
               method="dialog"
               onSubmit={(event) => {
                  event.preventDefault();
                  request.onSubmit(text.trim());
                  onClose();
               }}
            >
               <h2>{request.title}</h2>
               <label>
                  {request.label}
                  <textarea
                     rows={4}
                     value={text}
                     onChange={(e) => setText(e.target.value)}
                     autoFocus
                  />
               </label>
               <div className="row end">
                  <button type="button" onClick={onClose}>
                     Cancel
                  </button>
                  <button
                     type="submit"
                     className="primary"
                     disabled={request.required && text.trim() === ""}
                  >
                     {request.confirm}
                  </button>
               </div>
            </form>
         )}
      </dialog>
   );
}
