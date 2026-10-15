import "server-only";
import { after } from "next/server";
import { runJob } from "./pipeline";

/**
 * Schedules a job to run after the current response has been sent. On hosts
 * that cannot run `after` callbacks, the job stays queued and is picked up by
 * the status poll (which nudges stale jobs) or the /api/jobs/run cron.
 */
export function kickJob(jobId: string): void {
  try {
    after(async () => {
      try {
        await runJob(jobId);
      } catch (err) {
        console.error("[jobs] background run failed", { jobId, message: err instanceof Error ? err.message : String(err) });
      }
    });
  } catch {
    // Outside a request scope (e.g. scripts): run inline without awaiting.
    void runJob(jobId).catch((err) => console.error("[jobs] inline run failed", { jobId, message: err instanceof Error ? err.message : String(err) }));
  }
}
