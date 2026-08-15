"use server";

// Server actions backing the admin product-page editor. RLS (migration
// 0023: admin-gated UPDATE on amblux_product_pages/amblux_products, and
// admin-gated INSERT on the product-images storage bucket) is the actual
// enforcement — requireAdmin() here is defense in depth (fail fast with a
// clear redirect instead of a silently-ignored no-op write), matching the
// same pattern already used in app/admin/distributors/actions.ts.
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

// Uploaded file (if any) always wins; otherwise falls back to whatever's
// in the paired text field (which is pre-filled with the current URL, so
// leaving it untouched is a no-op, and clearing it removes the image).
async function resolveImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  pathPrefix: string,
): Promise<string | null> {
  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${pathPrefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (!error) {
      return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
  }
  const pasted = String(formData.get("imageUrl") || "").trim();
  return pasted || null;
}

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

  const heroImageUrl = await resolveImageUrl(supabase, formData, `pages/${slug}/hero`);

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
      hero_image_url: heroImageUrl,
      status: formData.get("status") === "hidden" ? "hidden" : "active",
    })
    .eq("slug", slug);

  if (error) {
    redirect(`/admin/products/${slug}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/admin/products/${slug}`);
  revalidatePath(`/products/${slug}`);
  redirect(`/admin/products/${slug}?saved=1`);
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

  const imageUrl = await resolveImageUrl(supabase, formData, `products/${sku}`);

  const { error } = await supabase
    .from("amblux_products")
    .update({
      label: String(formData.get("label") || ""),
      short_description: String(formData.get("shortDescription") || "").trim() || null,
      image_url: imageUrl,
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
  redirect(`/admin/products/${pageSlug}/${encodeURIComponent(sku)}?saved=1`);
}
