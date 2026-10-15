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
    <GiftPlayer
      gift={toPublicGift(gift)}
      preview
      banner={
        <Link href={`/gifts/${id}`} className="inline-flex items-center rounded-full bg-paper/90 px-3.5 py-1.5 text-xs font-semibold text-ink shadow-soft backdrop-blur hover:bg-paper">
          ← Back to editing
        </Link>
      }
    />
  );
}
