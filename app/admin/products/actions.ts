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
