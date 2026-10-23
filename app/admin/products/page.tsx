import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProductPageStatusAction } from "./actions";

const CATEGORY_LABEL: Record<string, string> = {
  "silicone-linear": "Silicone linear",
  "rigid-linear": "Rigid linear",
  puck: "Puck lights",
  driver: "Drivers",
  control: "Controls",
  accessory: "Accessories",
};

// Every product page can be in any of these four states — previously this
// list only ever showed/edited two of them (Active implicitly, Hidden as
// a badge), even though Backordered and Coming soon have been real,
// selectable options on the page's own edit screen all along.
const STATUS_OPTIONS = ["active", "backordered", "coming_soon", "hidden"] as const;
const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  backordered: "Backordered",
  coming_soon: "Coming soon",
  hidden: "Hidden",
};
const STATUS_BADGE_CLASS: Record<string, string> = {
  backordered: "bg-orange-100 text-orange-700",
  coming_soon: "bg-blue-100 text-blue-700",
  hidden: "bg-amber-100 text-amber-700",
};

// Every product_pages row is editable here — the 13 family pages and, as
// of migration 0022, every individual accessory/replacement-part page
// too (each accessory used to be grouped under one shared catalog page;
// now each has its own row and its own edit screen, same as a family).
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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

      <Link
        href="/admin/products/new"
        className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
      >
        + Add new SKU
      </Link>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {[...grouped.entries()].map(([category, rows]) => (
        <section key={category} className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {CATEGORY_LABEL[category] ?? category} ({rows!.length})
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {rows!.map((page) => (
              <div
                key={page.slug}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent"
              >
                <Link href={`/admin/products/${page.slug}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{page.name}</p>
                  <p className="truncate text-xs text-muted">{page.eyebrow} · /products/{page.slug}</p>
                </Link>

                <div className="flex shrink-0 items-center gap-2">
                  {page.status !== "active" ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[page.status] ?? "bg-amber-100 text-amber-700"}`}
                    >
                      {STATUS_LABEL[page.status] ?? page.status}
                    </span>
                  ) : null}

                  <form action={updateProductPageStatusAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="slug" value={page.slug} />
                    <select
                      name="status"
                      defaultValue={page.status}
                      className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:border-accent hover:text-accent-strong"
                    >
                      Update
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
