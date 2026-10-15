import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { MobileNav } from "./MobileNav";

export const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#occasions", label: "Occasions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-line">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo compact />
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-text-muted hover:text-ink transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button href="/dashboard" variant="ghost" size="sm">
            My gifts
          </Button>
          <Button href="/create" size="sm">
            Create your gift
          </Button>
        </div>
        <MobileNav links={[...NAV_LINKS]} />
      </div>
    </header>
  );
}
