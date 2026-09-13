"use client";

// Client-side "should the chat widget even show itself" check. This is a
// UX nicety only — it decides whether to render the floating button, never
// a security boundary. The real gate is server-side in app/api/chat/
// route.ts's isAuthorized(), which runs this exact same check
// (amblux_profiles.role === "admin" && approved) against the request's own
// session on every call, regardless of what the browser thinks.
//
// Stage 1 of the staged rollout agreed with the site owner (2026-09-13):
// admin-only. Stage 2 will also accept a per-account "chat tester" flag;
// Stage 3 opens this to any approved, signed-in account. When that
// changes, update this hook AND app/api/chat/route.ts's isAuthorized()
// together — they must never drift apart.
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
      .select("role, approved")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setEnabled(!!data && data.role === "admin" && data.approved === true);
        setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  return { enabled, loading: userLoading || profileLoading };
}
