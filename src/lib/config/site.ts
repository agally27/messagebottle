/**
 * Public, non-secret site configuration. Safe to import from client code.
 */
export const siteConfig = {
  name: "Message in a Bottle",
  shortName: "Bottle",
  tagline: "More than a message. A feeling, made for you.",
  description:
    "Turn a personal message into a beautiful, personalised digital story with music and imagery — and, if you like, a real keepsake bottle to hold it.",
  url: (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000"
  ).replace(/\/$/, ""),
  supportEmail: "hello@messageinabottle.example",
  company: "Message in a Bottle",
  locale: "en-GB",
  currency: "GBP",
} as const;
