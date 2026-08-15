// Only rendered when the page is printed (the SiteHeader/logo is hidden in
// print via print:hidden) — replaces it with the plain-text masthead the
// original site's "Download product PDF" output used, per the reference
// PDF: "AMBLUX • COMPLETE CABINET LIGHTING SOLUTIONS" over a hairline rule.
export function PrintMasthead() {
  return (
    <div className="hidden print:block">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">
        AMBLUX • Complete Cabinet Lighting Solutions
      </p>
      <hr className="mt-3 border-border" />
    </div>
  );
}
