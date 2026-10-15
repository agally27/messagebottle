import type { Metadata } from "next";
import { ProsePage } from "@/components/site/Prose";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <ProsePage eyebrow="Terms" title="The short, fair version." intro="These terms cover using Message in a Bottle and buying gifts. They are a working draft prepared for launch and have not yet been reviewed by a solicitor." updated="October 2026">
      <h2>What we provide</h2>
      <p>A service that turns your message into a personalised digital story, with the option to buy a physical keepsake containing your printed message and a code linking to the story.</p>
      <h2>Your content</h2>
      <p>You keep ownership of everything you write. You give us permission to process it to create and deliver your gift. You confirm you have the right to share the content you enter, and that it is not unlawful, harassing, sexually explicit involving minors, or an attempt to impersonate someone without their consent.</p>
      <h2>Generated content</h2>
      <p>Stories, imagery and audio are generated from your words with AI tools. They may contain imperfections. You review and approve the gift before it is sent; what you send is your responsibility. We never present generated words as the authentic words of a real person who did not write them.</p>
      <h2 id="refunds">Payments and refunds</h2>
      <ul>
        <li>Prices are shown before payment and include VAT where applicable.</li>
        <li>Digital gifts are delivered immediately after payment. Because they are personalised and delivered instantly, they are not refundable once the private link has been opened, except where the gift is faulty.</li>
        <li>Physical items are made to order. You may cancel before dispatch for a full refund. Damaged or faulty items are replaced or refunded.</li>
        <li>Nothing here affects your statutory rights.</li>
      </ul>
      <h2>Acceptable use</h2>
      <p>We may remove content and suspend accounts that break these terms or the law, and we provide a way for anyone to <a href="/support#report">report a gift</a>.</p>
      <h2>Liability</h2>
      <p>We provide the service with reasonable care and skill. We are not liable for losses that were not foreseeable, or that arise from your breach of these terms. Our total liability is limited to the amount you paid for the gift concerned.</p>
      <h2>Contact</h2>
      <p>{siteConfig.company} — <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>.</p>
    </ProsePage>
  );
}
