"use server";

// Server actions backing the admin product-page editor. RLS (migration
// 0023: admin-gated UPDATE on amblux_product_pages/amblux_products, and
// admin-gated INSERT on the product-images/product-documents storage
// buckets) is the actual enforcement — requireAdmin() here is defense in
// depth (fail fast with a clear redirect instead of a silently-ignored
// no-op write), matching the same pattern already used in
// app/admin/distributors/actions.ts.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("amblux_profiles").select("role, approved").eq("id", user.id).single();
  if (!profile || profile.role !== "admin" || !profile.approved) redirect("/account");

  return supabase;
}

function linesOf(formData: FormData, field: string): string[] {
  return String(formData.get(field) || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// Google Drive's "Copy link" / "Share" button gives a URL like
// drive.google.com/file/d/<id>/view?usp=sharing — that opens Drive's own
// viewer page, not the image itself, so pasting it straight into an
// <img> src renders as a broken image (this is exactly what happened
// with two accessory pages: the share link was pasted into the hero
// image field and looked like the upload "didn't work"). Convert it to
// Drive's direct-view format, which actually serves the image bytes —
// same format already used for every other Drive-hosted product photo
// on the site. Anything that isn't a recognized share/open link passes
// through unchanged. (Applies equally to PDFs — a Drive-hosted spec
// sheet share link has the exact same problem.)
function normalizeDriveUrl(url: string): string {
  const shareMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (shareMatch) return `https://drive.google.com/uc?export=view&id=${shareMatch[1]}`;
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  return url;
}

// Uploaded file (if any) always wins; otherwise falls back to whatever's
// in the paired text field (which is pre-filled with the current URL, so
// leaving it untouched is a no-op, and clearing it removes the value).
// fileField/urlField let this same helper drive multiple independent
// slots on one form (hero image, gallery image 2, gallery image 3, each
// document row) without name collisions.
//
// If the upload itself fails (bad file type, storage error, etc.) this
// falls back to the pasted-URL field rather than saving a broken file —
// but now it also reports *why* via uploadError, so the caller can
// surface it instead of silently looking like nothing happened.
async function resolveFileUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  bucket: string,
  pathPrefix: string,
  fileField: string,
  urlField: string,
): Promise<{ url: string | null; uploadError: string | null }> {
  const file = formData.get(fileField);
  if (file instanceof File && file.size > 0) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${pathPrefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) {
      const pastedFallback = String(formData.get(urlField) || "").trim();
      return { url: pastedFallback ? normalizeDriveUrl(pastedFallback) : null, uploadError: error.message };
    }
    return { url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, uploadError: null };
  }
  const pasted = String(formData.get(urlField) || "").trim();
  return { url: pasted ? normalizeDriveUrl(pasted) : null, uploadError: null };
}

const GALLERY_SLOTS = [
  { fileField: "imageFile", urlField: "imageUrl", pathSuffix: "hero" },
  { fileField: "imageFile2", urlField: "imageUrl2", pathSuffix: "gallery2" },
  { fileField: "imageFile3", urlField: "imageUrl3", pathSuffix: "gallery3" },
] as const;

const DOCUMENT_ROW_COUNT = 5;

export async function updateProductPageAction(formData: FormData) {
  const supabase = await requireAdmin();
  const slug = String(formData.get("slug") || "");
  if (!slug) redirect("/admin/products");

  let requiredAccessories: unknown;
  const requiredAccessoriesRaw = String(formData.get("requiredAccessories") || "[]").trim() || "[]";
  try {
    requiredAccessories = JSON.parse(requiredAccessoriesRaw);
  } catch {
    redirect(`/admin/products/${slug}?error=${encodeURIComponent("Required accessories must be valid JSON — nothing was saved.")}`);
  }

  // Slot 0 is the hero image; slots 1-2 are the additional gallery
  // images (up to 3 total on the page, per the recent request). Each
  // resolves independently so one failing upload doesn't block the
  // others.
  const images = await Promise.all(
    GALLERY_SLOTS.map((slot) => resolveFileUrl(supabase, formData, "product-images", `pages/${slug}/${slot.pathSuffix}`, slot.fileField, slot.urlField)),
  );
  const [heroImage, ...galleryImages] = images;
  const galleryImageUrls = galleryImages.map((g) => g.url).filter((url): url is string => Boolean(url));
  const imageUploadErrors = images.map((i) => i.uploadError).filter(Boolean) as string[];

  // Up to 5 {label, url} document rows (spec sheets, install guides,
  // certifications, etc.) — a row with no resulting URL is dropped
  // entirely rather than saved as a blank entry.
  const documents = await Promise.all(
    Array.from({ length: DOCUMENT_ROW_COUNT }).map(async (_, i) => {
      const label = String(formData.get(`docLabel${i}`) || "").trim();
      const resolved = await resolveFileUrl(supabase, formData, "product-documents", `pages/${slug}/doc${i}`, `docFile${i}`, `docUrl${i}`);
      return { label, url: resolved.url, uploadError: resolved.uploadError };
    }),
  );
  const documentUrls = documents.filter((d) => d.url).map((d) => ({ label: d.label || "Document", url: d.url }));
  const documentUploadErrors = documents.map((d) => d.uploadError).filter(Boolean) as string[];

  const { error } = await supabase
    .from("amblux_product_pages")
    .update({
      eyebrow: String(formData.get("eyebrow") || ""),
      name: String(formData.get("name") || ""),
      hero_summary: String(formData.get("heroSummary") || "").trim() || null,
      marketing_paragraphs: linesOf(formData, "marketingParagraphs"),
      features: linesOf(formData, "features"),
      applications: linesOf(formData, "applications"),
      required_accessories: requiredAccessories as never,
      optional_accessory_codes: linesOf(formData, "optionalAccessoryCodes"),
      hero_image_url: heroImage.url,
      gallery_image_urls: galleryImageUrls as never,
      document_urls: documentUrls as never,
      status: formData.get("status") === "hidden" ? "hidden" : "active",
    })
    .eq("slug", slug);

  if (error) {
    redirect(`/admin/products/${slug}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/products/${slug}`);
  revalidatePath(`/products/${slug}`);

  const params = new URLSearchParams({ saved: "1" });
  const allUploadErrors = [...imageUploadErrors, ...documentUploadErrors];
  if (allUploadErrors.length > 0) params.set("imageError", allUploadErrors.join("; "));
  redirect(`/admin/products/${slug}?${params.toString()}`);
}

const SPEC_ROW_COUNT = 16;

export async function updateProductVariantAction(formData: FormData) {
  const supabase = await requireAdmin();
  const sku = String(formData.get("sku") || "");
  const pageSlug = String(formData.get("pageSlug") || "");
  if (!sku) redirect("/admin/products");

  const spec = Array.from({ length: SPEC_ROW_COUNT })
    .map((_, i) => ({
      label: String(formData.get(`specLabel${i}`) || "").trim(),
      value: String(formData.get(`specValue${i}`) || "").trim(),
    }))
    .filter((row) => row.label);

  const image = await resolveFileUrl(supabase, formData, "product-images", `products/${sku}`, "imageFile", "imageUrl");

  const { error } = await supabase
    .from("amblux_products")
    .update({
      label: String(formData.get("label") || ""),
      short_description: String(formData.get("shortDescription") || "").trim() || null,
      image_url: image.url,
      spec,
      status: (formData.get("status") as "active" | "backordered" | "coming_soon" | "hidden") || "active",
    })
    .eq("sku", sku);

  if (error) {
    redirect(`/admin/products/${pageSlug}/${encodeURIComponent(sku)}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/products/${pageSlug}`);
  revalidatePath(`/admin/products/${pageSlug}/${encodeURIComponent(sku)}`);
  revalidatePath(`/products/${pageSlug}`);

  const params = new URLSearchParams({ saved: "1" });
  if (image.uploadError) params.set("imageError", image.uploadError);
  redirect(`/admin/products/${pageSlug}/${encodeURIComponent(sku)}?${params.toString()}`);
}

// Adds a brand-new SKU — either as another variant on an existing product
// page, or as the first SKU of a brand-new product page (an entirely new
// accessory or product line). Needs migration
// admin_can_insert_products_and_pages, since before that there was no
// INSERT policy on either table at all (only UPDATE) and this had no way
// to work through RLS.
export async function createProductAction(formData: FormData) {
  const supabase = await requireAdmin();

  const mode = String(formData.get("mode") || "existing");
  const sku = String(formData.get("sku") || "").trim().toUpperCase();
  const label = String(formData.get("label") || "").trim();
  // The category a SKU is filed under for pricing purposes (Category &
  // SKU overrides in /admin/pricing use this) — a different vocabulary
  // from the product PAGE's category below, which is what groups pages
  // on the public site and in the admin product list.
  const productCategory = String(formData.get("productCategory") || "").trim();
  const status = (formData.get("status") as "active" | "backordered" | "coming_soon" | "hidden") || "active";
  const shortDescription = String(formData.get("shortDescription") || "").trim() || null;
  const fobUsdRaw = String(formData.get("fobUsd") || "").trim();

  if (!sku) redirect(`/admin/products/new?error=${encodeURIComponent("SKU is required.")}`);
  if (!label) redirect(`/admin/products/new?error=${encodeURIComponent("Label is required.")}`);
  if (!productCategory) {
    redirect(`/admin/products/new?error=${encodeURIComponent("Category (for pricing) is required.")}`);
  }

  const { data: existingSku } = await supabase.from("amblux_products").select("sku").eq("sku", sku).maybeSingle();
  if (existingSku) {
    redirect(`/admin/products/new?error=${encodeURIComponent(`SKU ${sku} already exists.`)}`);
  }

  let pageSlug: string;
  let axisKeys: string[] = [];

  if (mode === "new") {
    // Kebab-case whatever was typed into the slug field, same normalization
    // a person would do by hand — lets them type a readable name and get a
    // clean URL without a separate "slugify" step.
    pageSlug = String(formData.get("newPageSlug") || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const pageCategory = String(formData.get("newPageCategory") || "").trim();
    const name = String(formData.get("newPageName") || "").trim();
    const eyebrow = String(formData.get("newPageEyebrow") || "").trim() || name;
    const heroSummary = String(formData.get("newPageHeroSummary") || "").trim() || null;

    if (!pageSlug || !pageCategory || !name) {
      redirect(
        `/admin/products/new?error=${encodeURIComponent("Product name, category, and page URL are all required when creating a new product.")}`,
      );
    }

    const { data: existingPage } = await supabase
      .from("amblux_product_pages")
      .select("slug")
      .eq("slug", pageSlug)
      .maybeSingle();
    if (existingPage) {
      redirect(`/admin/products/new?error=${encodeURIComponent(`A product page at /products/${pageSlug} already exists.`)}`);
    }

    // Up to 3 variant axes (e.g. Length, Colour temperature) — only
    // needed for a product that will offer multiple SKU options. Left
    // empty, this behaves like every existing accessory page: one page,
    // one SKU, no picker.
    const axes: { key: string; label: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const key = String(formData.get(`axisKey${i}`) || "").trim();
      const axisLabel = String(formData.get(`axisLabel${i}`) || "").trim();
      if (key && axisLabel) axes.push({ key, label: axisLabel });
    }
    axisKeys = axes.map((a) => a.key);

    const { error: pageError } = await supabase.from("amblux_product_pages").insert({
      slug: pageSlug,
      category: pageCategory,
      eyebrow,
      name,
      hero_summary: heroSummary,
      variant_axes: axes as never,
      default_sku: sku,
      status: "active",
    });
    if (pageError) {
      redirect(`/admin/products/new?error=${encodeURIComponent(pageError.message)}`);
    }
  } else {
    pageSlug = String(formData.get("existingPageSlug") || "").trim();
    if (!pageSlug) {
      redirect(`/admin/products/new?error=${encodeURIComponent("Choose which product page this SKU belongs on.")}`);
    }
    try {
      axisKeys = JSON.parse(String(formData.get("existingPageAxisKeys") || "[]")) as string[];
    } catch {
      axisKeys = [];
    }
  }

  // Each axis this page/SKU needs (e.g. length, cct) gets its value from a
  // same-named field the form renders once the page/axes are known — see
  // AddSkuForm.tsx.
  const variantOptions: Record<string, string> = {};
  for (const key of axisKeys) {
    const value = String(formData.get(`axisValue_${key}`) || "").trim();
    if (value) variantOptions[key] = value;
  }

  const image = await resolveFileUrl(supabase, formData, "product-images", `products/${sku}`, "imageFile", "imageUrl");

  const { error: productError } = await supabase.from("amblux_products").insert({
    sku,
    category: productCategory,
    label,
    short_description: shortDescription,
    status,
    image_url: image.url,
    page_slug: pageSlug,
    variant_options: variantOptions as never,
    // Explicitly an array, not the column's own '{}' (object) default —
    // see migration fix_accessory_spec_not_array for exactly what goes
    // wrong on the product page if this is ever a bare object instead.
    spec: [] as never,
  });

  if (productError) {
    redirect(`/admin/products/new?error=${encodeURIComponent(productError.message)}`);
  }

  // FOB cost is optional here — a SKU with no cost row just shows up in
  // the "no cost on file" list on /admin/pricing until one is added, same
  // as any other uncosted SKU.
  if (fobUsdRaw) {
    const fobUsd = Number(fobUsdRaw);
    if (!Number.isNaN(fobUsd) && fobUsd >= 0) {
      await supabase.from("amblux_product_cost").upsert({ sku, fob_usd: fobUsd, is_estimated: false, notes: null });
    }
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${pageSlug}`);
  revalidatePath(`/products/${pageSlug}`);
  revalidatePath("/admin/pricing");

  const params = new URLSearchParams({ created: "1" });
  if (image.uploadError) params.set("imageError", image.uploadError);
  redirect(`/admin/products/${pageSlug}/${encodeURIComponent(sku)}?${params.toString()}`);
}
