import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const CATEGORY_LABEL: Record<string, string> = {
  "silicone-linear": "Silicone linear",
  "rigid-linear": "Rigid linear",
  puck: "Puck lights",
  driver: "Drivers",
  control: "Controls",
  accessory: "Accessories",
};

// Every product_pages row is editable here — the 13 family pages and, as
// of migration 0022, every individual accessory/replacement-part page
// too (each accessory used to be grouped under one shared catalog page;
// now each has its own row and its own edit screen, same as a family).
export default async function AdminProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: myProfile } = await supabase.from("amblux_profiles").select("role, approved").eq("id", user.id).single();
  if (!myProfile || myProfile.role !== "admin" || !myProfile.approved) redirect("/account");

  const { data: pages } = await supabase
    .from("amblux_product_pages")
    .select("slug, category, name, eyebrow, status")
    .order("category")
    .order("name");

  const grouped = new Map<string, typeof pages>();
  for (const page of pages ?? []) {
    const key = page.category;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(page);
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Admin</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Product pages</h1>
      <p className="mt-2 text-sm text-muted">
        Edit the marketing copy, specs, accessories text, and images shown on each product page.
        {" "}
        <Link href="/account" className="text-accent-strong hover:underline">
          ← Back to account
        </Link>
      </p>

      {[...grouped.entries()].map(([category, rows]) => (
        <section key={category} className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {CATEGORY_LABEL[category] ?? category} ({rows!.length})
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {rows!.map((page) => (
              <Link
                key={page.slug}
                href={`/admin/products/${page.slug}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 hover:border-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{page.name}</p>
                  <p className="truncate text-xs text-muted">{page.eyebrow} · /products/{page.slug}</p>
                </div>
                {page.status === "hidden" ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    Hidden
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
