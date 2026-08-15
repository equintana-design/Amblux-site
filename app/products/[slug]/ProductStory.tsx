import type { Tables } from "@/lib/supabase/database.types";

export function ProductStory({ page }: { page: Tables<"amblux_product_pages"> }) {
  const paragraphs = (page.marketing_paragraphs ?? []) as string[];
  if (paragraphs.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-20 lg:grid-cols-[0.7fr_1.5fr] lg:gap-16 print:py-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">{page.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">{page.name}</h2>
        </div>
        <div className="space-y-5 text-base leading-7 text-muted">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
