import type { Metadata } from "next";
import { ProsePage } from "@/components/site/Prose";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Privacy" title="Your words are yours." intro="Personal messages are private by nature. This notice explains what we collect, why, and what you control. It is written to meet UK GDPR expectations but has not yet been independently reviewed." updated="October 2026">
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details</strong>: your email address, to sign you in and send order confirmations.</li>
        <li><strong>Gift content</strong>: the message, names, memories and preferences you enter, and the story, scenes and audio created from them.</li>
        <li><strong>Order details</strong>: what you bought and, for physical items, a delivery address. Card details are handled by our payment provider and never touch our servers.</li>
        <li><strong>Technical data</strong>: basic logs (route, status, timing) needed to run the service. We do not log message contents.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To create, store and deliver your gift, including sending your text to AI providers to write the story, describe scenes and, where enabled, produce imagery or narration. Providers process it only to fulfil your request.</li>
        <li>To take payment and fulfil physical orders.</li>
        <li>To keep the service secure, prevent abuse and respond to reports.</li>
      </ul>
      <p>We do not sell personal data, use your messages for advertising, or use them to train AI models.</p>
      <h2>Who can see a gift</h2>
      <p>Only people who have the private link. Links are long and random. Recipients never see your email address or account details. You can revoke a link at any time from <a href="/dashboard">My gifts</a>.</p>
      <h2>Retention and deletion</h2>
      <p>Gifts stay available while your account exists so recipients can return to them. Drafts you never finish are removed after 90 days. You can delete any gift, which removes its content and generated media. You can request deletion of your account and all data at <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>.</p>
      <h2>Your rights</h2>
      <p>You can ask for a copy of your data, correct it, delete it, or object to processing. Contact us and we will respond within one month. You may also complain to the Information Commissioner&apos;s Office.</p>
      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you signed in and keep the service secure. There are no advertising or tracking cookies.</p>
      <h2>Children</h2>
      <p>Gifts may be made <em>for</em> children by adults. Accounts are for people aged 18 and over.</p>
    </ProsePage>
  );
}
