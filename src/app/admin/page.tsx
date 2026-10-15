import type { Metadata } from "next";
import { configurationSummary } from "@/lib/config/env";
import { requireAdminOrNotFound } from "@/lib/auth/guards";
import { getStore } from "@/lib/data";
import { formatPrice } from "@/lib/config/products";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  await requireAdminOrNotFound("/admin");
  const store = getStore();
  const [jobs, failed, orders, audit] = await Promise.all([store.jobs.listRecent(200), store.jobs.listRecent(50, "failed"), store.orders.listAll(undefined, 500), store.audit.listRecent(20)]);
  const config = configurationSummary();
  const paid = orders.filter((o) => o.status !== "pending" && o.status !== "cancelled" && o.status !== "refunded");
  const revenueMinor = paid.reduce((a, o) => a + o.totalMinor, 0);
  const costMinor = jobs.reduce((a, j) => a + j.usage.reduce((b, u) => b + u.estimatedCostMinor, 0), 0);
  const awaiting = orders.filter((o) => o.shippingAddress && (o.status === "paid" || o.status === "fulfilling"));
  return (
    <div>
      <h1 className="text-3xl">Overview</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Recent jobs" value={String(jobs.length)} sub={`${failed.length} failed`} />
        <Stat label="Paid orders" value={String(paid.length)} sub={`${orders.filter((o) => o.status === "pending").length} incomplete`} />
        <Stat label="Revenue (paid)" value={formatPrice(revenueMinor)} sub="incl. demo payments" />
        <Stat label="Est. generation cost" value={formatPrice(costMinor)} sub="from provider usage" />
      </div>
      <h2 className="mt-10 text-2xl">Fulfilment queue</h2>
      <p className="mt-1 text-sm text-text-muted">{awaiting.length} physical order{awaiting.length === 1 ? "" : "s"} waiting.</p>
      <h2 className="mt-10 text-2xl">Configuration</h2>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(config).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-lg border border-line bg-paper px-4 py-2 text-sm">
            <dt className="text-text-muted">{k}</dt>
            <dd className="font-semibold text-ink">{String(v)}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-10 text-2xl">Recent activity</h2>
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-paper text-sm">
        {audit.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
            <span><span className="font-semibold text-ink">{a.action}</span> <span className="text-text-muted">{a.subjectType} {a.subjectId?.slice(0, 8)}</span></span>
            <span className="text-xs text-text-faint">{new Date(a.at).toLocaleString("en-GB")}</span>
          </li>
        ))}
        {audit.length === 0 ? <li className="px-4 py-3 text-text-muted">Nothing yet.</li> : null}
      </ul>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
      {sub ? <p className="text-xs text-text-muted">{sub}</p> : null}
    </div>
  );
}
