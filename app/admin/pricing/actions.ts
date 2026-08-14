"use server";

// Server actions for the pricing engine admin panel. Same defense-in-depth
// pattern as app/admin/distributors/actions.ts: RLS on amblux_product_cost
// / amblux_pricing_parameters (admin-only, migration 0007) and the
// admin-only check inside amblux_recalculate_pricing() are the actual
// enforcement. requireAdmin() here just fails fast with a clear redirect
// instead of letting a non-admin's attempt silently no-op against RLS.
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

function numberField(formData: FormData, name: string): number {
  return Number(formData.get(name));
}

// Shared by both the global-parameters edit form and the scoped-override
// add/edit form — same ten ladder fields either way, just a different
// scope/scope_key.
function parametersFromForm(formData: FormData) {
  return {
    freight_usd: numberField(formData, "freight_usd"),
    insurance_usd: numberField(formData, "insurance_usd"),
    brokerage_usd: numberField(formData, "brokerage_usd"),
    duty_pct: numberField(formData, "duty_pct"),
    inland_cad: numberField(formData, "inland_cad"),
    qc_pct: numberField(formData, "qc_pct"),
    fx_usd_cad: numberField(formData, "fx_usd_cad"),
    amblux_margin_pct: numberField(formData, "amblux_margin_pct"),
    distributor_margin_pct: numberField(formData, "distributor_margin_pct"),
    dealer_margin_pct: numberField(formData, "dealer_margin_pct"),
  };
}

export async function updateGlobalParametersAction(formData: FormData) {
  const supabase = await requireAdmin();
  await supabase
    .from("amblux_pricing_parameters")
    .update({ ...parametersFromForm(formData), updated_at: new Date().toISOString() })
    .eq("scope", "global");
  revalidatePath("/admin/pricing");
}

export async function upsertScopedParametersAction(formData: FormData) {
  const supabase = await requireAdmin();
  const scope = String(formData.get("scope") || "");
  const scopeKey = String(formData.get("scope_key") || "").trim();
  if ((scope !== "category" && scope !== "sku") || !scopeKey) {
    revalidatePath("/admin/pricing");
    return;
  }

  await supabase
    .from("amblux_pricing_parameters")
    .upsert(
      { scope, scope_key: scopeKey, ...parametersFromForm(formData), updated_at: new Date().toISOString() },
      { onConflict: "scope,scope_key" },
    );
  revalidatePath("/admin/pricing");
}

export async function deleteScopedParametersAction(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") || "");
  await supabase.from("amblux_pricing_parameters").delete().eq("id", id).neq("scope", "global");
  revalidatePath("/admin/pricing");
}

export async function updateProductCostAction(formData: FormData) {
  const supabase = await requireAdmin();
  const sku = String(formData.get("sku") || "");
  const fobUsd = numberField(formData, "fob_usd");
  const isEstimated = formData.get("is_estimated") === "on";
  const notes = String(formData.get("notes") || "").trim() || null;

  await supabase
    .from("amblux_product_cost")
    .update({ fob_usd: fobUsd, is_estimated: isEstimated, notes, updated_at: new Date().toISOString() })
    .eq("sku", sku);
  revalidatePath("/admin/pricing");
}

export async function addProductCostAction(formData: FormData) {
  const supabase = await requireAdmin();
  const sku = String(formData.get("sku") || "").trim();
  const fobUsd = numberField(formData, "fob_usd");
  if (!sku || Number.isNaN(fobUsd)) {
    revalidatePath("/admin/pricing");
    return;
  }

  await supabase.from("amblux_product_cost").upsert({ sku, fob_usd: fobUsd, is_estimated: false, notes: null });
  revalidatePath("/admin/pricing");
}

// Recalculation is on-demand only (a deliberate design decision — see
// migration 0007's header) rather than live/automatic. Redirects with a
// query param carrying the result so the page can show a plain success
// banner without any client-side JS.
export async function recalculatePricingAction() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.rpc("amblux_recalculate_pricing");
  if (error) {
    redirect(`/admin/pricing?recalc_error=${encodeURIComponent(error.message)}`);
  }
  const skusPriced = data?.[0]?.skus_priced ?? 0;
  revalidatePath("/admin/pricing");
  revalidatePath("/configurator");
  redirect(`/admin/pricing?recalc_ok=${skusPriced}`);
}

// Minimal CSV line splitter — handles quoted fields (with embedded commas
// and doubled "" escapes) since that's what /admin/pricing/export produces
// and what a spreadsheet app re-saves. Not a general CSV parser (no
// multi-line quoted fields), which is fine for this single-row-per-SKU,
// no-newlines-in-values shape.
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// Bulk-updates AMBLUX-supplied FOB costs from an uploaded CSV. Only reads
// the sku / fob_usd / is_estimated / notes columns — the same file
// /admin/pricing/export downloads (which also includes computed prices as
// reference columns) can be edited and re-uploaded here directly, since the
// extra price columns are simply ignored on import. Doesn't touch pricing
// parameters/margins — those are edited per-scope in the section above,
// not via CSV, since a bad bulk margin edit is a much bigger blast radius
// than a bad bulk cost edit.
export async function importCostCsvAction(formData: FormData) {
  const supabase = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin/pricing?import_error=${encodeURIComponent("No file selected")}`);
  }

  const text = await (file as File).text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    redirect(`/admin/pricing?import_error=${encodeURIComponent("File has no data rows")}`);
  }

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const skuIdx = header.indexOf("sku");
  const fobIdx = header.indexOf("fob_usd");
  const estimatedIdx = header.indexOf("is_estimated");
  const notesIdx = header.indexOf("notes");

  if (skuIdx === -1 || fobIdx === -1) {
    redirect(
      `/admin/pricing?import_error=${encodeURIComponent("CSV must have at least 'sku' and 'fob_usd' columns")}`,
    );
  }

  const rows: { sku: string; fob_usd: number; is_estimated: boolean; notes: string | null }[] = [];
  const skipped: string[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const sku = (cols[skuIdx] ?? "").trim();
    const fobRaw = (cols[fobIdx] ?? "").trim();
    const fob = Number(fobRaw);
    if (!sku || fobRaw === "" || Number.isNaN(fob) || fob < 0) {
      if (sku) skipped.push(sku);
      continue;
    }
    rows.push({
      sku,
      fob_usd: fob,
      is_estimated: estimatedIdx !== -1 ? ["true", "1", "yes", "on"].includes((cols[estimatedIdx] ?? "").trim().toLowerCase()) : false,
      notes: notesIdx !== -1 ? (cols[notesIdx] ?? "").trim() || null : null,
    });
  }

  if (rows.length === 0) {
    redirect(`/admin/pricing?import_error=${encodeURIComponent("No valid rows found (need sku + non-negative fob_usd)")}`);
  }

  const { error } = await supabase
    .from("amblux_product_cost")
    .upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), { onConflict: "sku" });

  if (error) {
    redirect(`/admin/pricing?import_error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/pricing");
  const suffix = skipped.length > 0 ? `&import_skipped=${skipped.length}` : "";
  redirect(`/admin/pricing?import_ok=${rows.length}${suffix}`);
}
