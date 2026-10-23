import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { SceneArt } from "@/components/art/SceneArt";
import { GlowingBottle } from "@/components/art/GlowingBottle";
import { signOutAction } from "@/lib/actions/auth";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import { getOccasion } from "@/lib/domain/occasions";
import type { GiftStatus } from "@/lib/domain/types";
import { formatPrice } from "@/lib/config/products";

export const metadata: Metadata = { title: "My gifts", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<GiftStatus, { label: string; tone: "neutral" | "gold" | "teal" | "success" | "warning" | "danger" }> = {
  draft: { label: "Draft", tone: "neutral" },
  generating: { label: "Generating", tone: "gold" },
  ready: { label: "Ready to send", tone: "teal" },
  active: { label: "Live", tone: "success" },
  revoked: { label: "Revoked", tone: "warning" },
  failed: { label: "Needs attention", tone: "danger" },
};

export default async function DashboardPage() {
  const user = await requireUserOrRedirect("/dashboard");
  const store = getStore();
  const [gifts, orders, unread] = await Promise.all([store.gifts.listByOwner(user.id), store.orders.listByOwner(user.id), store.replies.unreadCountsByOwner(user.id)]);
  return (
    <AppShell
      right={
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{user.displayName ? `Hello, ${user.displayName}` : "My gifts"}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">My gifts</h1>
        </div>
        <Button href="/create">Create a new gift</Button>
      </div>

      {user.kind === "demo" ? (
        <Notice tone="demo" className="mt-6">
          You&apos;re using a guest account{env.dataBackend !== "supabase" ? " on a local demo data store" : ""}. Gifts are tied to this browser; clear your cookies and they can&apos;t be recovered.
        </Notice>
      ) : null}

      {gifts.length === 0 ? (
        <div className="relative mt-10 overflow-hidden rounded-2xl border border-line bg-paper p-10 text-center shadow-soft">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/3 rounded-full halo opacity-70 blur-2xl" aria-hidden />
          <GlowingBottle className="relative mx-auto h-36 w-auto" />
          <h2 className="relative mt-4 text-2xl">Nothing here yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-text-muted">Your first gift takes about ten minutes. Start with the occasion.</p>
          <div className="mt-6">
            <Button href="/create" size="lg">
              Create your first gift
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gifts.map((g) => {
            const first = g.story?.scenes[0];
            const spec = first?.art.kind === "procedural" ? first.art.spec : { theme: g.input.theme, motif: "bottle" as const, timeOfDay: "dusk" as const, seed: 1 };
            const s = STATUS[g.status];
            return (
              <li key={g.id} className="overflow-hidden rounded-xl border border-line bg-paper shadow-soft">
                <Link href={g.status === "generating" || g.status === "draft" ? `/gifts/${g.id}/generating` : `/gifts/${g.id}`} className="block">
                  <div className="aspect-[16/9]">
                    <SceneArt spec={spec} alt="" />
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-text-faint">{getOccasion(g.input.occasion).label}</p>
                      <h2 className="mt-0.5 font-display text-xl text-ink">For {g.input.recipientName}</h2>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    Updated {new Date(g.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {g.status === "active" ? ` · opened ${g.openCount}×` : ""}
                  </p>
                  {unread[g.id] ? (
                    <Link href={`/gifts/${g.id}#replies`} className="mt-2 inline-flex">
                      <Badge tone="gold">{unread[g.id] === 1 ? "New reply" : `${unread[g.id]} new replies`}</Badge>
                    </Link>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button href={g.status === "generating" || g.status === "draft" ? `/gifts/${g.id}/generating` : `/gifts/${g.id}`} size="sm" variant="secondary">
                      {g.status === "generating" ? "View progress" : "Open"}
                    </Button>
                    {g.story ? (
                      <Button href={`/gifts/${g.id}/preview`} size="sm" variant="ghost">
                        Preview
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {orders.length > 0 ? (
        <section className="mt-12" aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="text-2xl">Orders</h2>
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-paper">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-ink">{o.items.map((i) => i.name).join(", ")}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {formatPrice(o.totalMinor)} · ref {o.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={o.status === "paid" || o.status === "dispatched" || o.status === "delivered" ? "success" : o.status === "pending" ? "neutral" : "warning"}>{o.status}</Badge>
                  <Link href={`/orders/${o.id}`} className="text-sm font-semibold text-ocean underline-offset-4 hover:underline">
                    Details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
