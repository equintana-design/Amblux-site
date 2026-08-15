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
