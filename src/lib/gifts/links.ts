import "server-only";
import { env } from "@/lib/config/env";
import type { Gift } from "@/lib/domain/types";

/** The recipient's private link. Always built from the public token, never the gift id. */
export function publicGiftUrl(gift: Pick<Gift, "publicToken">): string {
  return `${env.appUrl}/g/${gift.publicToken}`;
}
