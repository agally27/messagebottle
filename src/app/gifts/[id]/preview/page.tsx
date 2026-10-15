import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GiftPlayer } from "@/components/gift/GiftPlayer";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { getStore } from "@/lib/data";
import { toPublicGift } from "@/lib/gifts/service";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: PageProps<"/gifts/[id]/preview">) {
  const { id } = await params;
  const user = await requireUserOrRedirect(`/gifts/${id}/preview`);
  const gift = await getStore().gifts.get(id);
  if (!gift || gift.ownerId !== user.id) notFound();
  if (!gift.story) redirect(`/gifts/${id}`);
  return (
    <div className="relative">
      <Link href={`/gifts/${id}`} className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full bg-paper/90 px-4 py-2 text-xs font-semibold text-ink shadow-soft backdrop-blur hover:bg-paper">
        ← Back to editing
      </Link>
      <GiftPlayer gift={toPublicGift(gift)} preview />
    </div>
  );
}
