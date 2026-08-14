"use client";

import Link from "next/link";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";

export function AuthStatus() {
  const { user, loading } = useSupabaseUser();

  if (loading) return <span className="h-9 w-24" />;

  if (user) {
    return (
      <Link
        href="/account"
        className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
      >
        {user.email}
      </Link>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
    >
      Distributor sign in
    </Link>
  );
}
