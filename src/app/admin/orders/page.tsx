import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { requireAdminOrNotFound } from "@/lib/auth/guards";
import { formatPrice } from "@/lib/config/products";
import { getStore } from "@/lib/data";
import { orderRef } from "@/lib/orders/service";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdminOrNotFound("/admin/orders");
  const sp = await searchParams;
  const physicalOnly = sp.physical === "1";
  const orders = await getStore().orders.listAll({ physicalOnly }, 300);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl">Orders</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/orders" className={`rounded-full border px-3 py-1.5 ${!physicalOnly ? "border-ink bg-ink text-text-on-dark" : "border-line-strong"}`}>All</Link>
          <Link href="/admin/orders?physical=1" className={`rounded-full border px-3 py-1.5 ${physicalOnly ? "border-ink bg-ink text-text-on-dark" : "border-line-strong"}`}>Physical only</Link>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-paper">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wider text-text-faint">
            <tr>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fulfilment</th>
              <th className="px-4 py-3">Placed</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-2 font-mono text-xs">{orderRef(o)}</td>
                <td className="px-4 py-2">{o.items.map((i) => i.name).join(", ")}</td>
                <td className="px-4 py-2">{formatPrice(o.totalMinor)}</td>
                <td className="px-4 py-2"><Badge tone={o.status === "paid" || o.status === "delivered" ? "success" : o.status === "pending" ? "neutral" : o.status === "cancelled" || o.status === "refunded" ? "warning" : "teal"}>{o.status}</Badge></td>
                <td className="px-4 py-2 text-text-muted">{o.shippingAddress ? o.fulfilment.status : "digital"}</td>
                <td className="px-4 py-2 text-xs text-text-faint">{new Date(o.createdAt).toLocaleString("en-GB")}</td>
                <td className="px-4 py-2"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-ocean underline-offset-4 hover:underline">Open</Link></td>
              </tr>
            ))}
            {orders.length === 0 ? <tr><td colSpan={7} className="px-4 py-6 text-center text-text-muted">No orders yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
