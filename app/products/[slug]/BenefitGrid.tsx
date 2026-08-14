import type { Tables } from "@/lib/supabase/database.types";

export function BenefitGrid({ page }: { page: Tables<"amblux_product_pages"> }) {
  const features = (page.features ?? []) as string[];
  if (features.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">Features and benefits</p>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <article key={i} className="rounded-2xl border border-border p-6">
              <span className="text-sm font-semibold text-accent-soft">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-3 text-base leading-6 text-foreground">{feature}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
