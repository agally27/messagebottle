import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/site/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { GiftPlayer } from "@/components/gift/GiftPlayer";
import { GenerationProgress } from "@/components/gift/GenerationProgress";
import { StoryEditor } from "@/components/gift/StoryEditor";
import { GiftSettings } from "@/components/gift/GiftSettings";
import { MemoriesEditor } from "@/components/gift/MemoriesEditor";
import { SharePanel } from "@/components/gift/SharePanel";
import { DeleteGiftButton } from "@/components/gift/DeleteGiftButton";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { env } from "@/lib/config/env";
import { getStore } from "@/lib/data";
import { getOccasion } from "@/lib/domain/occasions";
import { getTheme } from "@/lib/domain/themes";
import { getGenerationStatus, publicGiftUrl, toPublicGift } from "@/lib/gifts/service";
import { demoCheckoutAvailable } from "@/lib/payments/checkout";
import { deliveryPanelData } from "@/lib/gifts/delivery";
import { openNoticePanel } from "@/lib/gifts/notifications";

export const metadata: Metadata = { title: "Your gift", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "gold" | "teal" | "success" | "warning" | "danger" }> = {
  draft: { label: "Draft", tone: "neutral" },
  generating: { label: "Generating", tone: "gold" },
  ready: { label: "Ready to send", tone: "teal" },
  active: { label: "Live", tone: "success" },
  revoked: { label: "Revoked", tone: "warning" },
  failed: { label: "Needs attention", tone: "danger" },
};

export default async function GiftPage({ params }: PageProps<"/gifts/[id]">) {
  const { id } = await params;
  const user = await requireUserOrRedirect(`/gifts/${id}`);
  const store = getStore();
  const gift = await store.gifts.get(id);
  if (!gift || gift.ownerId !== user.id) notFound();
  if (gift.status === "generating" || gift.status === "draft") redirect(`/gifts/${id}/generating`);

  const occasion = getOccasion(gift.input.occasion);
  const theme = getTheme(gift.input.theme);
  const status = STATUS_LABEL[gift.status] ?? STATUS_LABEL.draft!;
  const orders = await store.orders.listByGift(gift.id);
  const hasPaidOrder = orders.some((o) => o.status !== "pending" && o.status !== "cancelled");

  if (gift.status === "failed" || !gift.story) {
    const genStatus = await getGenerationStatus(gift);
    return (
      <AppShell narrow>
        <p className="eyebrow">For {gift.input.recipientName}</p>
        <h1 className="mt-2 text-3xl">We couldn&apos;t finish this gift</h1>
        <div className="mt-8">
          <GenerationProgress giftId={gift.id} initial={genStatus} />
        </div>
        <div className="mt-10 border-t border-line pt-6">
          <DeleteGiftButton giftId={gift.id} />
        </div>
      </AppShell>
    );
  }

  const publicGift = toPublicGift(gift, { preview: true });
  const delivery = await deliveryPanelData(user, gift);

  return (
    <AppShell className="max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{occasion.label}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">For {gift.input.recipientName}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
            <Badge tone={status.tone}>{status.label}</Badge>
            <span>{theme.name}</span>
            <span aria-hidden>·</span>
            <span>{gift.story.scenes.length} scenes{publicGift.photos.length ? `, ${publicGift.photos.length} ${publicGift.photos.length === 1 ? "photo" : "photos"}` : ""}</span>
            <span aria-hidden>·</span>
            <span>Written {gift.story.provenance.provider === "local" ? "from your words" : `with ${gift.story.provenance.provider}`}{gift.story.provenance.editedBySender ? ", edited by you" : ""}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button href={`/gifts/${gift.id}/preview`} variant="secondary">
            Full-screen preview
          </Button>
          <Button href="#share">Send it</Button>
        </div>
      </div>

      {gift.story.provenance.provider === "local" && env.storyProvider === "local" ? (
        <Notice tone="demo" className="mt-6">
          This story was composed locally from your exact words — every sentence you wrote is kept, with gentle framing added. Connect a story model (see docs/AI_PROVIDERS.md) for richer rewriting.
        </Notice>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-label="Preview" className="lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-2xl shadow-lift ring-1 ring-ink/10">
            <div className="h-[600px] sm:h-[680px]">
              <GiftPlayer gift={publicGift} preview embedded />
            </div>
          </div>
          <p className="mt-2 text-xs text-text-faint">This is exactly what {gift.input.recipientName} will see. Use the arrows to move through it.</p>
        </section>

        <div className="space-y-10">
          <section id="share" aria-labelledby="share-heading" className="rounded-xl border border-line bg-paper p-5 sm:p-6">
            <h2 id="share-heading" className="text-2xl">Send it</h2>
            <div className="mt-4">
              <SharePanel giftId={gift.id} status={gift.status} url={publicGiftUrl(gift)} recipientName={gift.input.recipientName} demoMode={demoCheckoutAvailable()} checkoutAvailable={env.stripeConfigured || demoCheckoutAvailable()} physicalAvailable={env.physicalProducts} hasPaidOrder={hasPaidOrder} openCount={gift.openCount} lastOpenedAt={gift.lastOpenedAt} emailAvailable={env.emailConfigured} delivery={delivery} openNotice={openNoticePanel(user, gift)} />
            </div>
          </section>

          <section aria-labelledby="edit-heading">
            <h2 id="edit-heading" className="text-2xl">Edit the words</h2>
            <p className="mt-1 text-sm text-text-muted">Change anything. Saving is instant and never regenerates the artwork.</p>
            <div className="mt-5">
              <StoryEditor giftId={gift.id} story={gift.story} />
            </div>
          </section>

          <section aria-labelledby="memories-heading">
            <h2 id="memories-heading" className="text-2xl">Photos, song and dedication</h2>
            <p className="mt-1 text-sm text-text-muted">Optional. Changes show in the preview straight away.</p>
            <div className="mt-5">
              <MemoriesEditor giftId={gift.id} photos={publicGift.photos} songUrl={gift.input.songUrl ?? ""} rememberedName={gift.input.rememberedName ?? ""} rememberedDates={gift.input.rememberedDates ?? ""} remembrance={gift.input.occasion === "remembrance"} />
            </div>
          </section>

          <section aria-labelledby="settings-heading">
            <h2 id="settings-heading" className="text-2xl">Look, sound and names</h2>
            <div className="mt-5">
              <GiftSettings giftId={gift.id} input={gift.input} />
            </div>
          </section>

          <section aria-labelledby="danger-heading" className="border-t border-line pt-6">
            <h2 id="danger-heading" className="text-base font-semibold text-text-muted">Remove</h2>
            <div className="mt-3">
              <DeleteGiftButton giftId={gift.id} />
            </div>
            <p className="mt-4 text-xs text-text-faint">
              Gift reference {gift.id.slice(0, 8)} · <Link href="/dashboard" className="underline-offset-4 hover:underline">Back to My gifts</Link>
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
