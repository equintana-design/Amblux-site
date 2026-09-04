// Save/reload a Configurator project to a signed-in distributor's account.
// Backed by amblux_quotes (migration 0001) — a table that already existed
// in the schema, shaped exactly for this ("one saved configurator run:
// full state + computed BOM snapshot + job number"), but was never wired
// up to any UI until now. RLS already scopes every read/write to
// `account_id = auth.uid()` (or an admin), so these helpers don't need to
// filter by user themselves — Supabase does it.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BomResult, ConfiguratorState } from "./types";
import { mergeConfiguratorState } from "./types";
import { generateJobNumber, hashBom } from "./engine";
import type { QuickProjectState } from "./quickProject";
import { bomFromQuickProject } from "./quickProject";

export interface QuoteSummary {
  id: string;
  jobNumber: string;
  projectName: string;
  totalWatts: number | null;
  status: string;
  updatedAt: string;
}

type Client = SupabaseClient<Database>;

// jsonb columns come back typed as the generic `Json` union — these two
// round-trip through JSON so the shape always matches ConfiguratorState/
// BomResult exactly (both are plain, JSON-serializable data already).
function toJson<T>(value: T): Database["public"]["Tables"]["amblux_quotes"]["Insert"]["state"] {
  return JSON.parse(JSON.stringify(value));
}

export async function saveQuote(
  supabase: Client,
  args: { id: string | null; accountId: string; state: ConfiguratorState; bom: BomResult },
): Promise<{ id: string; jobNumber: string }> {
  const jobNumber = generateJobNumber(args.state.project.name, hashBom(args.bom));
  const payload = {
    job_number: jobNumber,
    account_id: args.accountId,
    kind: "configurator" as const,
    state: toJson(args.state),
    bom: toJson(args.bom),
    total_watts: args.bom.total,
  };

  if (args.id) {
    const { error } = await supabase.from("amblux_quotes").update(payload).eq("id", args.id);
    if (error) throw error;
    return { id: args.id, jobNumber };
  }

  const { data, error } = await supabase.from("amblux_quotes").insert(payload).select("id").single();
  if (error) throw error;
  return { id: data.id, jobNumber };
}

export async function listMyQuotes(supabase: Client, accountId: string): Promise<QuoteSummary[]> {
  const { data, error } = await supabase
    .from("amblux_quotes")
    .select("id, job_number, state, total_watts, status, updated_at")
    .eq("account_id", accountId)
    // Since migration 0032, this table also holds Project (kind='quick')
    // saves — filtered out here so they never show up mixed into the
    // Configurator's own Saved Projects list. See listMyQuickProjects()
    // below for the Project-page equivalent of this function.
    .eq("kind", "configurator")
    .order("updated_at", { ascending: false })
    .limit(25);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const state = row.state as unknown as ConfiguratorState | null;
    return {
      id: row.id,
      jobNumber: row.job_number,
      projectName: state?.project?.name || "Untitled project",
      totalWatts: row.total_watts,
      status: row.status,
      updatedAt: row.updated_at,
    };
  });
}

export async function loadQuoteState(supabase: Client, id: string): Promise<ConfiguratorState | null> {
  const { data, error } = await supabase.from("amblux_quotes").select("state").eq("id", id).single();
  if (error || !data) return null;
  // Reconstitute on top of the current defaults rather than trusting the
  // saved JSON blob verbatim — see mergeConfiguratorState's comment for why.
  return mergeConfiguratorState(data.state as unknown as Partial<ConfiguratorState>);
}

// Permanent, immediate delete — the client-facing "Delete" button in
// SavedProjectsPanel.tsx. RLS ("users can delete their own amblux_quotes",
// migration 0031) restricts this to the caller's own row no matter what id
// is passed in; the FK's "on delete cascade" (migration 0001) cleans up
// amblux_quote_line_items for this quote automatically. This is separate
// from — and faster than — the 12-month retention cleanup (same migration
// 0031): that's a scheduled pg_cron job for projects nobody touches, this
// is a customer choosing to remove one right now.
export async function deleteQuote(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("amblux_quotes").delete().eq("id", id);
  if (error) throw error;
}

// ---- Project (formerly "Test Project") saves — see migration 0032 ----
//
// Same table, same RLS, same 12-month retention job, same delete flow
// (deleteQuote above works unchanged for either kind, since it only ever
// takes an id) as the Configurator's saves above — the only real
// difference is what's stored under `state`/`bom` and the `kind` column
// used to tell the two apart when listing. See lib/configurator/
// quickProject.ts for why the BOM is synthesized rather than real.

export interface QuickProjectSummary {
  id: string;
  jobNumber: string;
  projectName: string;
  itemCount: number;
  status: string;
  updatedAt: string;
}

export async function saveQuickProject(
  supabase: Client,
  args: { id: string | null; accountId: string; state: QuickProjectState }
): Promise<{ id: string; jobNumber: string }> {
  const bom = bomFromQuickProject(args.state);
  const jobNumber = generateJobNumber(args.state.name, hashBom(bom));
  const payload = {
    job_number: jobNumber,
    account_id: args.accountId,
    kind: "quick" as const,
    state: toJson(args.state),
    bom: toJson(bom),
    // Unlike a Configurator save, a Project has no real per-zone wattage
    // behind it (see bomFromQuickProject) — null rather than 0 so the
    // saved-projects list (which already handles a null total_watts,
    // see SavedProjectsPanel.tsx) correctly shows nothing instead of a
    // misleading "0 W".
    total_watts: null,
  };

  if (args.id) {
    const { error } = await supabase.from("amblux_quotes").update(payload).eq("id", args.id);
    if (error) throw error;
    return { id: args.id, jobNumber };
  }

  const { data, error } = await supabase.from("amblux_quotes").insert(payload).select("id").single();
  if (error) throw error;
  return { id: data.id, jobNumber };
}

export async function listMyQuickProjects(supabase: Client, accountId: string): Promise<QuickProjectSummary[]> {
  const { data, error } = await supabase
    .from("amblux_quotes")
    .select("id, job_number, state, status, updated_at")
    .eq("account_id", accountId)
    .eq("kind", "quick")
    .order("updated_at", { ascending: false })
    .limit(25);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const state = row.state as unknown as QuickProjectState | null;
    return {
      id: row.id,
      jobNumber: row.job_number,
      projectName: state?.name?.trim() || "Untitled project",
      itemCount: Array.isArray(state?.items) ? state.items.length : 0,
      status: row.status,
      updatedAt: row.updated_at,
    };
  });
}

export async function loadQuickProjectState(supabase: Client, id: string): Promise<QuickProjectState | null> {
  const { data, error } = await supabase.from("amblux_quotes").select("state").eq("id", id).eq("kind", "quick").single();
  if (error || !data) return null;
  const state = data.state as unknown as Partial<QuickProjectState> | null;
  // Reconstitute onto clean defaults rather than trusting the saved JSON
  // blob verbatim, same reasoning as mergeConfiguratorState — an older or
  // partially-written row shouldn't be able to crash the page.
  return {
    name: typeof state?.name === "string" ? state.name : "",
    items: Array.isArray(state?.items) ? state.items : [],
  };
}
