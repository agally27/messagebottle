import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { GenerationProgress } from "@/components/gift/GenerationProgress";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { getStore } from "@/lib/data";
import { getGenerationStatus } from "@/lib/gifts/service";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Creating your gift", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function GeneratingPage({ params }: PageProps<"/gifts/[id]/generating">) {
  const { id } = await params;
  const user = await requireUserOrRedirect(`/gifts/${id}/generating`);
  const gift = await getStore().gifts.get(id);
  if (!gift || gift.ownerId !== user.id) notFound();
  if (gift.status === "ready" || gift.status === "active" || gift.status === "revoked") redirect(`/gifts/${id}`);
  const status = await getGenerationStatus(gift);
  return (
    <AppShell narrow>
      <div className="text-center">
        <p className="eyebrow">For {gift.input.recipientName}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Making your gift</h1>
        <p className="mt-3 text-text-muted">This usually takes under a minute. You can leave this page; the gift will be waiting in My gifts.</p>
      </div>
      <div className="mt-10">
        <GenerationProgress giftId={gift.id} initial={status} />
      </div>
    </AppShell>
  );
}
