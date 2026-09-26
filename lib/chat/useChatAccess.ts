"use client";

// Client-side "should the chat widget even show itself" check. This is a
// UX nicety only — it decides whether to render the floating button, never
// a security boundary. The real gate is server-side in app/api/chat/
// route.ts's isAuthorized(), which runs this exact same check
// (approved && (role === "admin" || chat_tester)) against the request's
// own session on every call, regardless of what the browser thinks.
//
// Stage 2 of the staged rollout agreed with the site owner (2026-09-13,
// chat_tester flag added 2026-09-26 for a client demo): admin, or any
// approved account with amblux_profiles.chat_tester set (migration 0035,
// flipped per-account from /admin/distributors). Stage 3 opens this to any
// approved, signed-in account. When that changes, update this hook AND
// app/api/chat/route.ts's isAuthorized() together — they must never drift
// apart.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";

export function useChatAccess(): { enabled: boolean; loading: boolean } {
  const { user, loading: userLoading } = useSupabaseUser();
  const [enabled, setEnabled] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local "can this account use the chat" state from the external auth-session dependency change, same justified exception TestProjectProvider.tsx uses for its own localStorage sync.
      setEnabled(false);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);
    const supabase = createClient();
    supabase
      .from("amblux_profiles")
      .select("role, approved, chat_tester")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setEnabled(!!data && data.approved === true && (data.role === "admin" || data.chat_tester === true));
        setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  return { enabled, loading: userLoading || profileLoading };
}
