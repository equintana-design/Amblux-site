import { createClient } from "@/lib/supabase/server";
import { ConfiguratorClient } from "./ConfiguratorClient";
import { ConfiguratorLocked } from "./ConfiguratorLocked";

// Access gate: the configurator is a partner benefit, not a public tool.
// Reuses the same `approved` flag already built for role-based pricing —
// signing up is free and instant, but that alone was never sufficient to
// see distributor pricing, and now it's not sufficient to reach the
// configurator either. An admin approving an account (see
// /admin/distributors) is what actually turns both on at once, which
// matches how this is meant to work in practice: an admin approves an
// account specifically because that customer/distributor purchased
// through a partner, and approval is the one switch that grants both the
// tool and the pricing that goes with it.
export default async function ConfiguratorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <ConfiguratorLocked />;

  const { data: profile } = await supabase.from("amblux_profiles").select("approved").eq("id", user.id).single();

  if (!profile?.approved) return <ConfiguratorLocked />;

  return <ConfiguratorClient />;
}
