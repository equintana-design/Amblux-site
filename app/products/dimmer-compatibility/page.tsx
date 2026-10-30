import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/app/components/SiteHeader";
import { DIMMER_CHART_SERIES, DIMMER_CHART_TEST_DATE, DIMMER_COMPATIBILITY_CHART } from "@/lib/content/dimmerCompatibility";

export const metadata: Metadata = {
  title: "Recommended 120V line dimmers — AMBLUX",
  description:
    "Wall dimmers tested compatible with the AMBLUX Hardwire Driver Series (120V line voltage, TRIAC/MLV/ELV), by brand and model.",
};

// This page exists specifically to back the "by other" 120V line dimmer
// control option in the configurator (lib/configurator/catalog.ts's
// CONTROL_LABEL.lineDimmerByOther) and the Hardwire Driver Series product
// page (see CompatibleDimmersSection.tsx) — both point here rather than
// naming a brand/model themselves, since a wall dimmer is never an AMBLUX
// product: it's sourced and installed separately by the electrician doing
// the hardwire work. Data is static reference content (lib/content/
// dimmerCompatibility.ts), not admin-editable product-page content, since
// it's a vendor test result, not marketing copy.
export default function DimmerCompatibilityPage() {
  const totalModels = DIMMER_COMPATIBILITY_CHART.reduce((sum, g) => sum + g.models.length, 0);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 pt-6">
          <Link href="/products/hardwire-driver-series" className="text-sm font-medium text-accent-strong hover:underline">
            ← Back to Hardwire Driver Series
          </Link>
        </div>

        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-strong">AMBLUX Hardwire Driver Series</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">Recommended 120V line dimmers</h1>
            <p className="mt-4 max-w-3xl text-muted">
              A hardwired AMBLUX driver is controlled from a standard 120V wall dimmer, not a low-voltage AMBLUX
              accessory — that dimmer, and its installation, comes from a licensed electrician, not from AMBLUX. The
              models below have been tested directly against the AMBLUX Hardwire Driver Series and confirmed
              compatible, so an installer or electrician has a real, verified starting point instead of guessing.
            </p>
            <p className="mt-3 max-w-3xl text-muted">
              Every model listed tested <span className="font-medium text-foreground">Compatible</span> — this
              is not a mixed pass/fail list, just a reference of what&apos;s been verified. &ldquo;Dimming range&rdquo;
              is the usable brightness window reported for that dimmer; &ldquo;Type&rdquo; is the dimming
              technology (MLV = magnetic low-voltage / TRIAC-style forward-phase, ELV = electronic low-voltage
              reverse-phase, 0-10V = a separate low-voltage control signal) — AMBLUX&apos;s driver supports
              TRIAC, ELV, and MLV dimming, so any of these is a safe pairing.
            </p>
            <p className="mt-6 text-sm text-muted">
              {DIMMER_CHART_SERIES} Series compatibility test · {totalModels} models across {DIMMER_COMPATIBILITY_CHART.length}{" "}
              brands · tested {DIMMER_CHART_TEST_DATE}
            </p>
          </div>
        </section>

        {DIMMER_COMPATIBILITY_CHART.filter((group) => group.models.length > 0).map((group) => (
          <section key={group.brand} className="border-t border-border bg-surface">
            <div className="mx-auto w-full max-w-6xl px-6 py-10">
              <h2 className="text-lg font-semibold text-foreground">{group.brand}</h2>
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2">Input</th>
                      <th className="px-3 py-2">Dimming range</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.models.map((m, i) => (
                      <tr key={`${m.model}-${i}`} className="border-t border-border align-top">
                        <td className="px-3 py-2 font-mono text-xs text-accent-strong">{m.model}</td>
                        <td className="px-3 py-2 text-foreground">{m.input}</td>
                        <td className="px-3 py-2 text-foreground">{m.range}</td>
                        <td className="px-3 py-2 text-foreground">{m.type}</td>
                        <td className="px-3 py-2 text-muted">{m.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}

        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-6 py-10">
            <p className="text-xs text-muted">
              Transcription note: three Lutron models in the source test file (MA-PRO-WH, AY-603P-WH, TG-603PH-WH)
              carried a garbled value in the Type column where every other row uses MLV, ELV, MLV/ELV, or 0-10V.
              They&apos;re shown here as &ldquo;MLV/ELV&rdquo; — the most likely intended value given the rest of
              the column — rather than left unreadable; worth a quick confirmation with the vendor if it matters
              for a specific install.
            </p>
            <p className="mt-3 text-xs text-muted">
              Not seeing a dimmer you already have on hand, or need one for a line-voltage application not listed
              here? Contact AMBLUX directly before purchasing — an untested dimmer isn&apos;t necessarily
              incompatible, it just hasn&apos;t been verified yet.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
