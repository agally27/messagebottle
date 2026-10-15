import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { getStore } from "@/lib/data";
import { publicGiftUrl } from "@/lib/gifts/service";
import { BottleMark } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Print", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Print-ready insert for the physical bottle: the sender's original message,
 * the sign-off, and a QR code to the digital story. Owner or admin only.
 * Designed for an A5 sheet (or two inserts per A4), to be rolled and tied.
 */
export default async function PrintPage({ params }: PageProps<"/gifts/[id]/print">) {
  const { id } = await params;
  const user = await requireUserOrRedirect(`/gifts/${id}/print`);
  const gift = await getStore().gifts.get(id);
  if (!gift || (gift.ownerId !== user.id && !user.isAdmin)) notFound();
  const url = publicGiftUrl(gift);
  const qr = await QRCode.toDataURL(url, { width: 360, margin: 1, errorCorrectionLevel: "M", color: { dark: "#14213dff", light: "#ffffff00" } });
  const paragraphs = gift.input.message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <html lang="en-GB">
      <body className="bg-white text-ink font-sans">
        <style>{`@page { size: A5; margin: 14mm; } @media print { .no-print { display: none !important; } body { background: white; } }`}</style>
        <div className="no-print fixed left-0 right-0 top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-cream px-5 py-3 text-sm">
          <span className="text-text-muted">Print preview · A5 · gift {gift.id.slice(0, 8)}</span>
          <div className="flex gap-2">
            <a href={`/gifts/${gift.id}`} className="rounded-full border border-line-strong px-4 py-2 font-semibold text-ink">Back</a>
            <a href={`/api/gifts/${gift.id}/qr?size=1024`} className="rounded-full border border-line-strong px-4 py-2 font-semibold text-ink" download>QR only</a>
          </div>
        </div>
        <main className="mx-auto max-w-[148mm] px-6 pb-16 pt-20 print:px-0 print:pt-0">
          <header className="flex items-center gap-2 text-ink">
            <BottleMark className="h-6 text-ocean" />
            <span className="font-display text-base">Message in a Bottle</span>
          </header>
          <p className="mt-10 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-teal">For {gift.input.recipientName}</p>
          <h1 className="mt-2 font-display text-[1.75rem] leading-tight">{gift.story?.title ?? `A message for ${gift.input.recipientName}`}</h1>
          <section className="mt-8 space-y-4 font-display text-[1.02rem] leading-[1.7]">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {gift.input.memories ? <p className="italic text-text-muted">{gift.input.memories}</p> : null}
          </section>
          <p className="mt-8 font-display text-[1.05rem]">
            With love,
            <br />
            {gift.input.senderName}
          </p>
          {gift.input.datesAndPlaces ? <p className="mt-2 text-xs text-text-muted">{gift.input.datesAndPlaces}</p> : null}
          <footer className="mt-12 flex items-center gap-5 border-t border-line pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code for ${url}`} width={96} height={96} className="h-24 w-24 shrink-0" />
            <div className="text-xs leading-relaxed text-text-muted">
              <p className="font-semibold text-ink">Your story is waiting.</p>
              <p>Scan this code with your phone camera to open the illustrated story that goes with this message, with music.</p>
              <p className="mt-1 break-all text-[0.62rem] text-text-faint">{url}</p>
            </div>
          </footer>
        </main>
      </body>
    </html>
  );
}
