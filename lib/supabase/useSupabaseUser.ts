"use client";

// Small client-side hook that tracks the current Supabase auth session in
// the browser. Used anywhere the UI needs to react to sign-in/sign-out
// immediately (the header's auth status pill, the live pricing panel)
// without a full page reload — onAuthStateChange fires the moment a
// sign-in/sign-up/sign-out server action completes and the browser client
// picks up the new session cookie.
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./client";

export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
