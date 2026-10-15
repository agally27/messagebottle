import type { Metadata } from "next";
import { GiftPlayer } from "@/components/gift/GiftPlayer";
import { Button } from "@/components/ui/Button";
import { BottleMark } from "@/components/ui/Logo";
import { getPublicGift } from "@/lib/gifts/service";
import { siteConfig } from "@/lib/config/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/g/[token]">): Promise<Metadata> {
  const { token } = await params;
  const gift = await getPublicGift(token);
  return {
    title: gift ? `A message for ${gift.recipientName}` : "Message in a Bottle",
    description: gift ? `${gift.recipientName}, someone has a message for you.` : siteConfig.description,
    robots: { index: false, follow: false },
    openGraph: { title: gift ? `A message for ${gift.recipientName}` : siteConfig.name, description: "Someone has a message for you." },
  };
}

/**
 * The recipient page. Public, but only reachable with an unguessable token.
 * No account, no app. Nothing about the sender's account is exposed.
 */
export default async function RecipientPage({ params }: PageProps<"/g/[token]">) {
  const { token } = await params;
  const gift = await getPublicGift(token);
  if (!gift) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 py-20 text-center text-text-on-dark">
        <BottleMark className="h-12 text-seaglass" />
        <h1 className="mt-6 font-display text-3xl text-text-on-dark">This message isn&apos;t available.</h1>
        <p className="mt-3 max-w-md text-text-on-dark-muted">The link may be incomplete, or the sender may have withdrawn it. If someone sent you this, ask them to check their gift in My gifts.</p>
        <div className="mt-8 flex gap-3">
          <Button href="/" variant="onDark">What is Message in a Bottle?</Button>
          <Button href="/support" variant="onDark">Get help</Button>
        </div>
      </main>
    );
  }
  return <GiftPlayer gift={gift} />;
}
