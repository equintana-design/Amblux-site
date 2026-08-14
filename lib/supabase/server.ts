// Server-side Supabase client, for use in Server Components, Server
// Actions, and Route Handlers. Reads/writes the auth session via Next's
// cookies() so a signed-in distributor's session is visible on the server
// (e.g. to decide whether to fetch distributor pricing).
//
// Server Components can't write cookies, so the write calls here are
// wrapped in a try/catch — that's expected any time this is called from a
// Server Component that's only reading the session; middleware.ts is what
// actually refreshes the session cookie on every request.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — no-op. The session cookie
            // still gets refreshed on the next request via middleware.ts.
          }
        },
      },
    },
  );
}
