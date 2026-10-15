import type { Metadata } from "next";
import { ProsePage } from "@/components/site/Prose";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return (
    <ProsePage eyebrow="Support" title="We&apos;re here to help." intro="Questions about an order, a link that isn&apos;t working, or something you&apos;d like changed — write to us and a person will reply.">
      <h2>Contact</h2>
      <p>
        Email <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>. Include the gift or order reference from <a href="/dashboard">My gifts</a> if you have one. We aim to reply within one working day.
      </p>
      <h2>Common fixes</h2>
      <ul>
        <li><strong>The link says the gift isn&apos;t available.</strong> The sender may have revoked it or not finished sending. Ask them to check My gifts.</li>
        <li><strong>No sound.</strong> Tap the sound control on the gift; browsers only play audio after you interact with the page. Check your device isn&apos;t muted.</li>
        <li><strong>I want to change the story.</strong> Open the gift in My gifts and choose Edit. Changes apply instantly to the recipient&apos;s link.</li>
      </ul>
      <h2 id="report">Report a gift</h2>
      <p>
        If you have received a link containing content that is abusive, harassing, impersonates you, or otherwise shouldn&apos;t have been sent, email <a href={`mailto:${siteConfig.supportEmail}?subject=Report%20a%20gift`}>{siteConfig.supportEmail}</a> with the link. We review every report, remove content that breaks our <a href="/terms">terms</a>, and never share your details with the sender.
      </p>
    </ProsePage>
  );
}
