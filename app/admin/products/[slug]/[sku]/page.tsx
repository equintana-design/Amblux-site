import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProductVariantAction } from "../../actions";

const SPEC_ROW_COUNT = 16;

export default async function AdminProductVariantEdit({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; sku: string }>;
  searchParams: Promise<{ error?: string; saved?: string; imageError?: string }>;
}) {
  const { slug, sku: skuParam } = await params;
  const sku = decodeURIComponent(skuParam);
  const { error, saved, imageError } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: myProfile } = await supabase.from("amblux_profiles").select("role, approved").eq("id", user.id).single();
  if (!myProfile || myProfile.role !== "admin" || !myProfile.approved) redirect("/account");

  const { data: product } = await supabase.from("amblux_products").select("*").eq("sku", sku).single();
  if (!product) notFound();

  const spec = (product.spec ?? []) as { label: string; value: string }[];
  const specRows = Array.from({ length: SPEC_ROW_COUNT }).map((_, i) => spec[i] ?? { label: "", value: "" });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Admin</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{product.label}</h1>
      <p className="mt-2 text-sm text-muted">
        <code>{product.sku}</code> ·{" "}
        <Link href={`/admin/products/${slug}`} className="text-accent-strong hover:underline">
          ← Back to {slug}
        </Link>
      </p>

      {saved ? <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">Saved.</p> : null}
      {imageError ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Everything else saved, but the image upload failed: {imageError}. The previous image (if any) was kept —
          try a smaller file or a different format.
        </p>
      ) : null}
      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <form action={updateProductVariantAction} className="mt-8 flex flex-col gap-6" encType="multipart/form-data">
        <input type="hidden" name="sku" value={product.sku} />
        <input type="hidden" name="pageSlug" value={slug} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Label</span>
            <input
              name="label"
              defaultValue={product.label}
              className="rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Status</span>
            <select
              name="status"
              defaultValue={product.status}
              className="rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="active">Active</option>
              <option value="backordered">Backordered</option>
              <option value="coming_soon">Coming soon</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Short description</span>
          <textarea
            name="shortDescription"
            defaultValue={product.short_description ?? ""}
            rows={3}
            className="rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-muted">Product image</span>
          {product.image_url ? (
            <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border bg-background">
              <Image src={product.image_url} alt="" fill className="object-contain p-2" sizes="128px" />
            </div>
          ) : null}
          <input
            name="imageUrl"
            defaultValue={product.image_url ?? ""}
            placeholder="Image URL (paste a Drive link, or upload a file below)"
            className="rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input type="file" name="imageFile" accept="image/*" className="text-xs text-muted" />
          <p className="text-xs text-muted">Uploading a file replaces whatever is in the URL field above.</p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted">Spec table rows (leave label blank to remove a row)</span>
          <div className="flex flex-col gap-2">
            {specRows.map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  name={`specLabel${i}`}
                  defaultValue={row.label}
                  placeholder="Label"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  name={`specValue${i}`}
                  defaultValue={row.value}
                  placeholder="Value"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="self-start rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
