import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { requireAdminOrNotFound } from "@/lib/auth/guards";
import { getStore } from "@/lib/data";
import { RetryJobButton } from "@/components/admin/RetryJobButton";

export const metadata: Metadata = { title: "Generation jobs", robots: { index: false } };
export const dynamic = "force-dynamic";

const TONE: Record<string, "neutral" | "gold" | "teal" | "success" | "warning" | "danger"> = { queued: "neutral", running: "gold", succeeded: "success", failed: "danger", cancelled: "warning" };

/** Jobs with errors and usage. Shows ids and codes — never message content. */
export default async function AdminJobs() {
  await requireAdminOrNotFound("/admin/jobs");
  const jobs = await getStore().jobs.listRecent(100);
  return (
    <div>
      <h1 className="text-3xl">Generation jobs</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-paper">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wider text-text-faint">
            <tr>
              <th className="px-4 py-3">Job</th>
              <th className="px-4 py-3">Gift</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Step</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Error</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="px-4 py-2 font-mono text-xs">{j.id.slice(0, 8)}</td>
                <td className="px-4 py-2 font-mono text-xs">{j.giftId.slice(0, 8)}</td>
                <td className="px-4 py-2"><Badge tone={TONE[j.status] ?? "neutral"}>{j.status}</Badge></td>
                <td className="px-4 py-2">{j.step}</td>
                <td className="px-4 py-2">{j.attempts}/{j.maxAttempts}</td>
                <td className="px-4 py-2">{j.mode}</td>
                <td className="px-4 py-2">{(j.usage.reduce((a, u) => a + u.estimatedCostMinor, 0) / 100).toFixed(2)}</td>
                <td className="px-4 py-2 text-xs text-text-muted">{j.lastError ? `${j.lastError.code}${j.lastError.permanent ? " (permanent)" : ""}` : ""}</td>
                <td className="px-4 py-2 text-xs text-text-faint">{new Date(j.updatedAt).toLocaleString("en-GB")}</td>
                <td className="px-4 py-2">{j.status === "failed" && !j.lastError?.permanent ? <RetryJobButton giftId={j.giftId} /> : null}</td>
              </tr>
            ))}
            {jobs.length === 0 ? <tr><td colSpan={10} className="px-4 py-6 text-center text-text-muted">No jobs yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
