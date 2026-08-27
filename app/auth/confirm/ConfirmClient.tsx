"use client";

// The actual token-exchange logic for the recovery/confirmation link,
// split into its own client component so the page above it can wrap this
// in a Suspense boundary (required by Next.js for useSearchParams()).
//
// Handles THREE possible shapes of the incoming link, because we can't
// fully control which one Supabase sends until the "Reset Password"
// email template in the dashboard is confirmed to use the token_hash
// link documented in app/account/actions.ts:
//
//   1. ?token_hash=...&type=recovery   — our custom template link.
//      Verified with verifyOtp().
//   2. ?code=...                        — PKCE-style confirmation URL.
//      Verified with exchangeCodeForSession().
//   3. #access_token=...&refresh_token=... — Supabase's DEFAULT
//      {{ .ConfirmationURL }} template (implicit flow). Its hosted
//      /verify endpoint does the verification itself and redirects back
//      here with the session in the URL *fragment* — which a server
//      Route Handler can never see (fragments aren't sent over HTTP),
//      which is why this now runs client-side instead. Handled with
//      setSession().
//
// This means the reset link works even if the dashboard template was
// never switched away from the default — that manual step is no longer
// a single point of failure for the whole flow.
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const EXPIRED_MESSAGE = "That link has expired or was already used — request a new one.";

export function ConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/account";
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type") as EmailOtpType | null;
      const code = searchParams.get("code");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      let error: { message: string } | null = null;

      if (access_token && refresh_token) {
        ({ error } = await supabase.auth.setSession({ access_token, refresh_token }));
      } else if (token_hash && type) {
        ({ error } = await supabase.auth.verifyOtp({ type, token_hash }));
      } else if (code) {
        ({ error } = await supabase.auth.exchangeCodeForSession(code));
      } else {
        error = { message: "missing token" };
      }

      if (cancelled) return;

      if (error) {
        setStatus(EXPIRED_MESSAGE);
        router.replace(`/sign-in?error=${encodeURIComponent(EXPIRED_MESSAGE)}`);
      } else {
        router.replace(next);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return <p>{status}</p>;
}
