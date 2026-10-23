import { SceneArt } from "@/components/art/SceneArt";
import { Notice } from "@/components/ui/Notice";
import { getMusicMood } from "@/lib/domain/music";
import { getOccasion } from "@/lib/domain/occasions";
import { getTheme } from "@/lib/domain/themes";
import { getTone } from "@/lib/domain/tones";
import { parseSongLink } from "@/lib/domain/song";
import { formatPrice } from "@/lib/config/products";
import type { Product } from "@/lib/domain/types";
import type { StepProps } from "../CreateWizard";
import { StepHeader } from "./StepHeader";

export function ReviewStep({ input, goTo, demoMode, signedIn, product, fromMinor, photoCount }: StepProps & { goTo: (i: number) => void; demoMode: boolean; signedIn: boolean; product: Product | null; fromMinor: number; photoCount: number }) {
  const song = parseSongLink(input.songUrl);
  const occasion = getOccasion(input.occasion);
  const theme = getTheme(input.theme);
  const transformation = { close: "Keep my words as they are", story: "Shape it into a story", poetic: "Make it more poetic" }[input.transformation];
  return (
    <div>
      <StepHeader eyebrow="Step 7" title="Ready to create it?" intro="Check everything once more. Nothing is sent until you've previewed the finished gift and chosen to share it." />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <dl className="divide-y divide-line rounded-xl border border-line bg-paper">
          <Row label="Occasion" onEdit={() => goTo(0)}>
            {input.occasion === "other" ? input.customOccasion : occasion.label}
          </Row>
          <Row label="For" onEdit={() => goTo(1)}>
            <span className="font-semibold">{input.recipientName}</span>
            {input.relationship ? <span className="text-text-muted"> · {input.relationship}</span> : null}
            <span className="block text-sm text-text-muted">From {input.senderName}</span>
          </Row>
          <Row label="Message" onEdit={() => goTo(2)}>
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{input.message}</p>
            {input.memories ? <p className="mt-2 text-sm text-text-muted"><span className="font-semibold text-ink">Memory:</span> {input.memories}</p> : null}
            {input.datesAndPlaces ? <p className="mt-1 text-sm text-text-muted"><span className="font-semibold text-ink">Date / place:</span> {input.datesAndPlaces}</p> : null}
            <p className="mt-2 text-sm text-text-muted">{getTone(input.tone).label} · {transformation}</p>
          </Row>
          <Row label="Memories" onEdit={() => goTo(3)}>
            {photoCount || song || input.rememberedName ? (
              <span className="text-[0.95rem]">
                {input.rememberedName ? <span className="block">In loving memory of {input.rememberedName}{input.rememberedDates ? `, ${input.rememberedDates}` : ""}</span> : null}
                {photoCount ? <span className="block">{photoCount} photo{photoCount === 1 ? "" : "s"}</span> : null}
                {song ? <span className="block">Song on {song.providerName}</span> : null}
              </span>
            ) : (
              <span className="text-text-muted">None added</span>
            )}
          </Row>
          <Row label="Look" onEdit={() => goTo(4)}>
            {theme.name}
          </Row>
          <Row label="Sound" onEdit={() => goTo(5)}>
            {getMusicMood(input.music).label}
            {input.narration ? " · narration offered" : ""}
          </Row>
        </dl>
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-line shadow-soft">
            <div className="aspect-[4/3]">
              <SceneArt spec={{ theme: input.theme, motif: "bottle", timeOfDay: theme.mode === "dark" ? "night" : "dusk", seed: 7 }} alt={`${theme.name} preview`} />
            </div>
            <div className="bg-paper p-4 text-sm text-text-muted">
              <p className="font-semibold text-ink">What happens next</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>We shape your message into a short story in {theme.name.toLowerCase()} style, usually 3–5 scenes.</li>
                <li>You read and edit every line in the preview.</li>
                <li>When you&apos;re happy, you pay and share the private link{product && product.kind === "physical" ? `, and we prepare the ${product.name}` : ""}.</li>
              </ol>
              {product ? <p className="mt-3">Selected: <span className="font-semibold text-ink">{product.name}</span> · {formatPrice(product.priceMinor)}{product.requiresShipping && product.shippingMinor ? ` + ${formatPrice(product.shippingMinor)} delivery` : ""}. You can change this at checkout.</p> : <p className="mt-3">Preview is free. Prices from {formatPrice(fromMinor)} when you choose to send.</p>}
            </div>
          </div>
          {demoMode ? (
            <Notice tone="demo" title="Demo mode">
              No AI service is connected, so the story is composed on this server from your exact words and the artwork is illustrated procedurally. {signedIn ? "" : "A guest account will be created for you so you can return to this gift."}
            </Notice>
          ) : signedIn ? null : (
            <Notice tone="info">You&apos;ll be asked to sign in so you can return to this gift later.</Notice>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children, onEdit }: { label: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[7rem_1fr_auto] sm:gap-4">
      <dt className="text-sm font-semibold text-text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
      <dd>
        <button type="button" onClick={onEdit} className="text-sm font-semibold text-ocean underline-offset-4 hover:underline">
          Edit
        </button>
      </dd>
    </div>
  );
}
