// Server-only Supabase client using the SERVICE ROLE key — this bypasses
// Row Level Security entirely. Never import this file from a "use client"
// component, never send its key to the browser in any form, and never
// widen its use beyond the narrow cases below.
//
// Why this exists at all: amblux_catalog_rules (the configurator's "rule
// book" — control options, driver sizing, receiver pairing, etc., see
// migration 0035 "unified_catalog_rules") is deliberately locked down via
// RLS to admins only (private.amblux_is_admin()), matching how
// amblux_pricing_parameters/amblux_product_cost are already protected. A
// regular signed-in client using the chat assistant is not an admin, so
// their own authenticated session correctly cannot read that table — and
// shouldn't be able to, since it's exactly the "recipe" this project is
// trying to keep off the browser. The chat's OWN server-side code is what
// needs to read it on the visitor's behalf, which is what the service role
// key is for: a secret that only ever lives in this Next.js server process
// (Vercel's server-side environment), never shipped in any bundle, never
// returned in any API response.
//
// Anything read with this client must be handled carefully: RLS isn't
// filtering results for you anymore, so any per-user restriction (which
// pricing tier someone can see, which quotes belong to them) must keep
// using the normal session-scoped client from ./server.ts instead. This
// client is for the narrow "server needs the master rule book, no user
// should ever see it directly" case only — see lib/chat/catalogRules.ts.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "createServiceRoleClient() requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
        "to be set as server-only environment variables (SUPABASE_SERVICE_ROLE_KEY must NOT have the " +
        "NEXT_PUBLIC_ prefix — that prefix ships a variable to the browser bundle).",
    );
  }
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
