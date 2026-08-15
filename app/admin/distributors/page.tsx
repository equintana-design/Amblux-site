import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setApprovalAction, setRoleAction } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  client: "Client",
  distributor: "Distributor",
  admin: "Admin",
};

const ROLE_OPTIONS = ["client", "distributor", "admin"] as const;

export default async function AdminDistributorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: myProfile } = await supabase.from("amblux_profiles").select("role, approved").eq("id", user.id).single();
  if (!myProfile || myProfile.role !== "admin" || !myProfile.approved) redirect("/account");

  // RLS ("admins can read all amblux_profiles") is what actually allows
  // this to see every account, not just the caller's own row.
  const { data: profiles } = await supabase
    .from("amblux_profiles")
    .select("id, email, role, company_name, approved, created_at")
    .order("created_at", { ascending: false });

  const pending = (profiles ?? []).filter((p) => !p.approved);
  const approved = (profiles ?? []).filter((p) => p.approved);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-soft">AMBLUX Admin</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Accounts</h1>
      <p className="mt-2 text-sm text-muted">
        Every account starts as a Client. Approving an account grants it access to its tier&apos;s pricing on the
        configurator, and you can promote a Client to Distributor or Admin below. Every other signed-in or
        anonymous visitor only ever sees MSRP — that&apos;s enforced by the database itself, not by this page.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Pending approval {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No accounts waiting on approval.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{p.email}</p>
                  <p className="text-xs text-muted">{p.company_name || "No company name provided"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={setRoleAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={p.id} />
                    <select
                      name="role"
                      defaultValue={p.role}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent-strong"
                    >
                      Update
                    </button>
                  </form>
                  <form action={setApprovalAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="approved" value="true" />
                    <button
                      type="submit"
                      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
                    >
                      Approve
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Approved</h2>
        {approved.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No approved accounts yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {approved.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {p.email} {p.id === user.id && <span className="text-xs text-muted">(you)</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {p.company_name || "No company name provided"} · {ROLE_LABEL[p.role] ?? p.role}
                  </p>
                </div>
                {p.id !== user.id && (
                  <div className="flex items-center gap-2">
                    <form action={setRoleAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={p.id} />
                      <select
                        name="role"
                        defaultValue={p.role}
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-accent hover:text-accent-strong"
                      >
                        Update
                      </button>
                    </form>
                    <form action={setApprovalAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="approved" value="false" />
                      <button
                        type="submit"
                        className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:border-accent hover:text-accent-strong"
                      >
                        Revoke
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
