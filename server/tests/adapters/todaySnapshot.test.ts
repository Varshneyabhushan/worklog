import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startTodaySnapshotWorker } from "../../src/adapters/workers/todaySnapshot";
import { TASK, makeApp } from "../fakes/app";

const snapshot = (files: { written: Map<string, string> }) =>
   JSON.parse(files.written.get("/data/today.json") ?? "{}") as { backlogCount?: number };

describe("today snapshot worker", () => {
   afterEach(() => vi.useRealTimers());

   it("rewrites today.json shortly after a change, without waiting for the timer", async () => {
      vi.useFakeTimers();
      const { useCases, files } = makeApp();
      const stop = startTodaySnapshotWorker({
         watchChanges: useCases.watchChanges,
         writeTodaySnapshot: useCases.writeTodaySnapshot,
         logger: pino({ level: "silent" }),
         refreshMs: 3_600_000,
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(snapshot(files).backlogCount).toBe(0);

      await useCases.createTask.execute(TASK);
      await vi.advanceTimersByTimeAsync(300);
      expect(snapshot(files).backlogCount).toBe(1);
      stop();
   });
});
