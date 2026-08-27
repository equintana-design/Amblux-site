import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets, Next internals, and
    // /auth/confirm, so the auth cookie stays fresh across normal
    // navigation without doing needless work on images/fonts/etc.
    //
    // /auth/confirm is excluded on purpose: it completes a one-time
    // PKCE code exchange (see app/auth/confirm/ConfirmClient.tsx) using
    // Supabase's browser client. If this middleware's own getUser() call
    // (which also talks to Supabase and can touch the same auth cookies)
    // runs on that same request first, it can interfere with the
    // exchange — Supabase's own flow_state record shows the token was
    // verified successfully, but the exchange still fails client-side.
    // Excluding the route avoids that race entirely.
    "/((?!_next/static|_next/image|favicon.ico|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
