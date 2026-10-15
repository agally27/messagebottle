import Link from "next/link";
import { AppShell } from "@/components/site/AppShell";
import { requireUserOrRedirect } from "@/lib/auth/guards";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/** Admin area: explicit authorisation on every request, not just here. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUserOrRedirect("/admin");
  if (!user.isAdmin) notFound();
  return (
    <AppShell className="max-w-6xl">
      <nav aria-label="Admin" className="mb-8 flex flex-wrap gap-2 text-sm">
        {[
          { href: "/admin", label: "Overview" },
          { href: "/admin/jobs", label: "Generation jobs" },
          { href: "/admin/orders", label: "Orders & fulfilment" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="rounded-full border border-line-strong bg-paper px-4 py-2 font-medium text-ink hover:border-ink/50">
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </AppShell>
  );
}
