import Image from "next/image";
import Link from "next/link";

// Shared header for public marketing pages (home, /products, /products/[slug]).
// Recreates the original ChatGPT-built site's `.site-header` structure
// (logo, EN/FR/ES language switcher, "Start a Project" CTA) recovered in
// index.html/styles.css. The language switcher is inert (site only has
// English copy today) — kept visible because it's part of the recognizable
// brand chrome, same reasoning as keeping the recovered layout shape.
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" aria-label="AMBLUX home">
          <Image src="/images/amblux-logo.png" alt="AMBLUX" width={140} height={40} priority className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted sm:flex">
            <Link href="/products" className="hover:text-foreground">
              Products
            </Link>
            <Link href="/#partners" className="hover:text-foreground">
              For Distributors
            </Link>
            <Link href="/configurator" className="hover:text-foreground">
              Configurator
            </Link>
          </nav>
          <div
            className="flex items-center overflow-hidden rounded-full border border-border text-xs font-semibold"
            role="group"
            aria-label="Language / Langue / Idioma"
          >
            <button type="button" aria-pressed="true" className="bg-foreground px-2.5 py-1.5 text-white">
              EN
            </button>
            <button type="button" aria-pressed="false" className="px-2.5 py-1.5 text-muted">
              FR
            </button>
            <button type="button" aria-pressed="false" className="px-2.5 py-1.5 text-muted">
              ES
            </button>
          </div>
          <Link
            href="/#partners"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            Start a Project
          </Link>
        </div>
      </div>
    </header>
  );
}
