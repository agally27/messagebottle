import type { Metadata } from "next";
import Link from "next/link";
import { GiftPlayer } from "@/components/gift/GiftPlayer";
import { buildExampleGift } from "@/lib/gifts/example";

export const metadata: Metadata = { title: "An example gift", description: "Open a sample Message in a Bottle gift to see what the recipient experiences." };

/** Static sample of the recipient experience. */
export default function ExamplePage() {
  const gift = buildExampleGift();
  return (
    <div className="relative">
      <Link href="/create" className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full bg-paper/90 px-4 py-2 text-xs font-semibold text-ink shadow-soft backdrop-blur hover:bg-paper">
        This is an example · Create your own →
      </Link>
      <GiftPlayer gift={gift} />
    </div>
  );
}
