"use server";

// Approve/revoke actions for the admin distributor list. RLS + the
// column-pinning trigger (migration 0006) are the actual enforcement —
// a non-admin's update attempt is silently ignored at the database level
// no matter what this action sends. The admin check here is defense in
// depth (fail fast with a clear redirect instead of a silently-ignored
// no-op update), not the only thing standing between a random signed-in
// user and someone else's approval status.
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

export async function setApprovalAction(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") || "");
  const approved = formData.get("approved") === "true";

  await supabase.from("amblux_profiles").update({ approved }).eq("id", id);
  revalidatePath("/admin/distributors");
}

// Every account starts as "client" (see private.handle_new_amblux_user,
// migration 0024) — this is how an admin moves one up to "distributor" or
// "admin". RLS + the column-pinning trigger enforce this is admin-only no
// matter what a non-admin's own update request sends; VALID_ROLES here is
// just a fast, clear rejection of a bad value before it ever reaches the
// database's own check constraint.
const VALID_ROLES = ["client", "distributor", "admin"];

export async function setRoleAction(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") || "");
  const role = String(formData.get("role") || "");
  if (!VALID_ROLES.includes(role)) return;

  await supabase.from("amblux_profiles").update({ role }).eq("id", id);
  revalidatePath("/admin/distributors");
}

// Kitchen Manufacturer vs Kitchen Dealer (migration 0030_business_type) —
// a Client-account concept the configurator's pricing panel uses for its
// resale-price estimate. A client can set this themselves from /account,
// but an admin can also set or clear it here for them directly (e.g. when
// onboarding an account on their behalf). Unlike role/approved, this
// column isn't pinned by the amblux_profiles_pin_restricted_columns
// trigger, so this only needs the admin-only gate requireAdmin() already
// provides — no separate migration required.
const VALID_BUSINESS_TYPES = ["manufacturer", "dealer"];

export async function setBusinessTypeAction(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") || "");
  const raw = String(formData.get("businessType") || "");
  const businessType = VALID_BUSINESS_TYPES.includes(raw) ? raw : null;

  await supabase.from("amblux_profiles").update({ business_type: businessType }).eq("id", id);
  revalidatePath("/admin/distributors");
}
