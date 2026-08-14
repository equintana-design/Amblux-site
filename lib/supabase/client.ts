// Browser-side Supabase client, for use inside "use client" components
// (e.g. the sign-in/sign-up forms, or anything that needs to react to
// auth state changes live in the browser).
//
// Uses the publishable/anon key only — never the service role key. RLS on
// every amblux_* table is what actually keeps this safe to ship to the
// browser; this client has no more access than the policies grant.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
