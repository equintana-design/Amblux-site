import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddSkuForm } from "../AddSkuForm";
import { createProductAction } from "../actions";

export default async function AddSkuPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; imageError?: string }>;
}) {
  const { error, imageError } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: myProfile } = await supabase.from("amblux_profiles").select("role, approved").eq("id", user.id).single();
  if (!myProfile || myProfile.role !== "admin" || !myProfile.approved) redirect("/account");

  const [{ data: pages }, { data: products }] = await Promise.all([
    supabase.from("amblux_product_pages").select("slug, name, category, variant_axes").order("category").order("name"),
    supabase.from("amblux_products").select("sku, category, page_slug").order("sku"),
  ]);

  const productCategories = Array.from(new Set((products ?? []).map((p) => p.category))).sort();
  const pageCategories = Array.from(new Set((pages ?? []).map((p) => p.category))).sort();

  // Prefill "Category (for pricing)" with whatever category the page's
  // other SKUs already use, since a second option on the same product
  // almost always belongs in the same pricing category as the first.
  const sampleCategoryByPage: Record<string, string> = {};
  const skuCountByPage: Record<string, number> = {};
  for (const p of products ?? []) {
    if (!p.page_slug) continue;
    if (!sampleCategoryByPage[p.page_slug]) sampleCategoryByPage[p.page_slug] = p.category;
    skuCountByPage[p.page_slug] = (skuCountByPage[p.page_slug] ?? 0) + 1;
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Admin</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Add a new SKU</h1>
      <p className="mt-2 text-sm text-muted">
        <Link href="/admin/products" className="text-accent-strong hover:underline">
          ← All product pages
        </Link>
      </p>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {imageError ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Everything else saved, but the photo upload failed: {imageError}. You can add a photo afterward from the
          SKU&apos;s own edit page.
        </p>
      ) : null}

      <p className="mt-4 rounded-lg bg-background px-4 py-3 text-sm text-muted">
        After adding a SKU here, it still needs a FOB cost and a &quot;Recalculate &amp; publish&quot; on{" "}
        <Link href="/admin/pricing" className="text-accent-strong hover:underline">
          /admin/pricing
        </Link>{" "}
        before it shows a price on the site — you can set the cost right here, or add it there afterward.
      </p>

      <AddSkuForm
        action={createProductAction}
        pages={(pages ?? []).map((p) => ({
          slug: p.slug,
          name: p.name,
          category: p.category,
          variant_axes: (p.variant_axes ?? []) as { key: string; label: string }[],
          skuCount: skuCountByPage[p.slug] ?? 0,
        }))}
        productCategories={productCategories}
        pageCategories={pageCategories}
        sampleCategoryByPage={sampleCategoryByPage}
      />
    </div>
  );
}
