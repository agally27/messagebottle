import type { Metadata } from "next";
import Link from "next/link";
import { GiftPlayer } from "@/components/gift/GiftPlayer";
import { buildExampleGift } from "@/lib/gifts/example";

export const metadata: Metadata = { title: "An example gift", description: "Open a sample Message in a Bottle gift to see what the recipient experiences." };

/** Static sample of the recipient experience. */
export default function ExamplePage() {
  const gift = buildExampleGift();
  return (
    <GiftPlayer
      gift={gift}
      banner={
        <Link href="/create" className="inline-flex max-w-full items-center truncate rounded-full bg-paper/90 px-3.5 py-1.5 text-xs font-semibold text-ink shadow-soft backdrop-blur hover:bg-paper">
          Example · Create your own →
        </Link>
      }
    />
  );
}
