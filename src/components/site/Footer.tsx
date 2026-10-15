import Link from "next/link";
import { BottleMark } from "@/components/ui/Logo";
import { siteConfig } from "@/lib/config/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-2.5 text-ink">
            <BottleMark className="h-7 text-ocean" />
            <span className="font-display text-lg">Message in a Bottle</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">{siteConfig.tagline} Personal messages, made into stories worth keeping.</p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { href: "/#how-it-works", label: "How it works" },
            { href: "/#occasions", label: "Occasions" },
            { href: "/pricing", label: "Pricing" },
            { href: "/example", label: "See an example" },
          ]}
        />
        <FooterCol
          title="Help"
          links={[
            { href: "/#faq", label: "FAQ" },
            { href: "/support", label: "Support & contact" },
            { href: "/support#report", label: "Report a gift" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "/terms#refunds", label: "Refunds" },
          ]}
        />
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.company}. Made with care in the UK.</p>
          <p>Stories are generated with AI from your own words and are always reviewed by you before sending.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-text-muted hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
