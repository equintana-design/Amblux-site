// Refreshes the Supabase auth session cookie on every request. Without
// this, a signed-in distributor's session can silently expire mid-visit
// because Server Components can't write cookies themselves (see the
// try/catch note in server.ts) — middleware is the one place in the
// request lifecycle that reliably can.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching getUser() is what actually triggers the refresh — don't
  // remove this call even though the result isn't used directly here.
  await supabase.auth.getUser();

  return response;
}
