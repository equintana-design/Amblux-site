import Link from "next/link";
import type { Tables } from "@/lib/supabase/database.types";
import { DIMMER_COMPATIBILITY_CHART } from "@/lib/content/dimmerCompatibility";

// Only renders on the Hardwire Driver Series page — a wall dimmer is the
// one accessory a hardwired install genuinely needs that AMBLUX doesn't
// sell (it's sourced and installed by the electrician doing the hardwire
// work, see lib/configurator/catalog.ts's CONTROL_LABEL.lineDimmerByOther
// and configuratorExtra.hardwireElectricianNote), so this is deliberately
// scoped to this one product page by slug rather than made a generic
// per-page content field — no other product page needs it.
export function CompatibleDimmersSection({ page }: { page: Tables<"amblux_product_pages"> }) {
  if (page.slug !== "hardwire-driver-series") return null;

  const brands = DIMMER_COMPATIBILITY_CHART.filter((g) => g.models.length > 0).map((g) => g.brand);

  return (
    <section className="border-t border-border bg-surface print:hidden">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Recommended dimmers</p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Compatible 120V line dimmers</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          A hardwired driver is controlled from a standard wall dimmer, sourced and installed by your electrician —
          not an AMBLUX product. These brands have tested models confirmed compatible: {brands.join(", ")}.
        </p>
        <Link
          href="/products/dimmer-compatibility"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-strong hover:underline"
        >
          View the full dimmer compatibility chart →
        </Link>
      </div>
    </section>
  );
}
