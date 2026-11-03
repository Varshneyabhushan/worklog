import type { Day, DayView, SearchHit, Task, TaskDetail, TaskStatus, Today } from "../shared/types";

export class ApiError extends Error {
   constructor(
      readonly code: string,
      message: string,
   ) {
      super(message);
   }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
   const res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
   });
   const json = (await res.json().catch(() => null)) as {
      data?: T;
      error?: { code: string; message: string };
   } | null;
   if (!res.ok || json === null) {
      throw new ApiError(json?.error?.code ?? "HTTP_ERROR", json?.error?.message ?? res.statusText);
   }
   return json.data as T;
}

export type TaskPatch = Partial<
   Pick<Task, "title" | "description" | "priority" | "due" | "blockedOn" | "tags" | "assignee">
>;

export const api = {
   today: () => call<Today>("GET", "/api/today"),
   tasks: (statuses?: TaskStatus[]) =>
      call<Task[]>("GET", `/api/tasks${statuses ? `?statuses=${statuses.join(",")}` : ""}`),
   task: (id: string) => call<TaskDetail>("GET", `/api/tasks/${id}`),
   editTask: (id: string, patch: TaskPatch) => call<Task>("PATCH", `/api/tasks/${id}`, patch),
   move: (id: string, status: TaskStatus) =>
      call<Task>("POST", `/api/tasks/${id}/move`, { status }),
   review: (id: string, decision: "done" | "picked", comment?: string) =>
      call<Task>("POST", `/api/tasks/${id}/review`, { decision, comment }),
   reopen: (id: string, to: "picked" | "backlog", reason: string) =>
      call<Task>("POST", `/api/tasks/${id}/reopen`, { to, reason }),
   undo: (id: string) => call<Task>("POST", `/api/tasks/${id}/undo`, {}),
   addUpdate: (id: string, body: string, inSummary: boolean) =>
      call("POST", `/api/tasks/${id}/updates`, { body, inSummary }),
   setInSummary: (updateId: number, inSummary: boolean) =>
      call("PATCH", `/api/updates/${updateId}`, { inSummary }),
   days: (before?: string) =>
      call<Day[]>("GET", `/api/days?limit=30${before ? `&before=${before}` : ""}`),
   day: (date: string) => call<DayView>("GET", `/api/days/${date}`),
   search: (query: string) =>
      call<SearchHit[]>("GET", `/api/search?q=${encodeURIComponent(query)}&limit=50`),
};
