import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProductPageAction } from "../actions";

type RequiredAccessory = {
  title: string;
  body?: string;
  items?: string[];
  links?: { label: string; slug: string }[];
};

export default async function AdminProductPageEdit({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; saved?: string; imageError?: string }>;
}) {
  const { slug } = await params;
  const { error, saved, imageError } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: myProfile } = await supabase.from("amblux_profiles").select("role, approved").eq("id", user.id).single();
  if (!myProfile || myProfile.role !== "admin" || !myProfile.approved) redirect("/account");

  const { data: page } = await supabase.from("amblux_product_pages").select("*").eq("slug", slug).single();
  if (!page) notFound();

  const { data: variants } = await supabase
    .from("amblux_products")
    .select("sku, label, status, image_url")
    .eq("page_slug", slug)
    .order("sku");

  const requiredAccessories = (page.required_accessories ?? []) as RequiredAccessory[];

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Admin</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">{page.name}</h1>
      <p className="mt-2 text-sm text-muted">
        /products/{page.slug} ·{" "}
        <Link href={`/products/${page.slug}`} target="_blank" className="text-accent-strong hover:underline">
          View live →
        </Link>{" "}
        · <Link href="/admin/products" className="text-accent-strong hover:underline">← All product pages</Link>
      </p>

      {saved ? (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">Saved.</p>
      ) : null}
      {imageError ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Everything else saved, but the image upload failed: {imageError}. The previous image (if any) was kept —
          try a smaller file or a different format.
        </p>
      ) : null}
      {error ? <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <form action={updateProductPageAction} className="mt-8 flex flex-col gap-6" encType="multipart/form-data">
        <input type="hidden" name="slug" value={page.slug} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Eyebrow</span>
            <input
              name="eyebrow"
              defaultValue={page.eyebrow}
              className="rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-muted">Status</span>
            <select
              name="status"
              defaultValue={page.status}
              className="rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Name</span>
          <input
            name="name"
            defaultValue={page.name}
            className="rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Hero summary (one sentence, shown under the title)</span>
          <textarea
            name="heroSummary"
            defaultValue={page.hero_summary ?? ""}
            rows={2}
            className="rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-muted">Hero image</span>
          {page.hero_image_url ? (
            <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border bg-background">
              <Image src={page.hero_image_url} alt="" fill className="object-contain p-2" sizes="128px" />
            </div>
          ) : null}
          <input
            name="imageUrl"
            defaultValue={page.hero_image_url ?? ""}
            placeholder="Image URL (paste a Drive link, or upload a file below)"
            className="rounded-lg border border-border bg-surface px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input type="file" name="imageFile" accept="image/*" className="text-xs text-muted" />
          <p className="text-xs text-muted">Uploading a file replaces whatever is in the URL field above.</p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Marketing paragraphs (one per line)</span>
          <textarea
            name="marketingParagraphs"
            defaultValue={((page.marketing_paragraphs ?? []) as string[]).join("\n")}
            rows={5}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Features &amp; benefits (one per line)</span>
          <textarea
            name="features"
            defaultValue={((page.features ?? []) as string[]).join("\n")}
            rows={5}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Recommended applications (one per line)</span>
          <textarea
            name="applications"
            defaultValue={((page.applications ?? []) as string[]).join("\n")}
            rows={4}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Optional accessory SKUs (one per line)</span>
          <textarea
            name="optionalAccessoryCodes"
            defaultValue={((page.optional_accessory_codes ?? []) as string[]).join("\n")}
            rows={3}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">
            Required accessories (JSON — array of {"{"}title, body?, items?, links?{"}"})
          </span>
          <textarea
            name="requiredAccessories"
            defaultValue={JSON.stringify(requiredAccessories, null, 2)}
            rows={10}
            spellCheck={false}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </label>

        <button
          type="submit"
          className="self-start rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
        >
          Save changes
        </button>
      </form>

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          SKUs on this page ({variants?.length ?? 0})
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          {(variants ?? []).map((v) => (
            <Link
              key={v.sku}
              href={`/admin/products/${page.slug}/${encodeURIComponent(v.sku)}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 hover:border-accent"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{v.label}</p>
                <code className="text-xs text-muted">{v.sku}</code>
              </div>
              {v.status !== "active" ? (
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {v.status}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
