// Static reference data for the MSA-series 120V line dimmer compatibility
// chart AMBLUX had tested against its hardwire driver series (see
// app/products/dimmer-compatibility/page.tsx and the condensed summary on
// the hardwire driver product page, CompatibleDimmersSection.tsx).
//
// Source: "MSA Series Dimmer Compatibility Chart" (vendor test spreadsheet,
// test date 2026-07-01), supplied directly by the business owner. Every
// model listed tested as "Compatible" — there were no incompatible rows in
// the source file, so the per-row status column was dropped in favour of
// one plain statement at the top of the page, rather than repeating the
// same word on all 65 rows.
//
// Transcribed as-is except for one disclosed correction: three LUTRON rows
// (MA-PRO-WH, AY-603P-WH, TG-603PH-WH) carried a garbled dimmer-type value
// ("前/ELV" — a stray Chinese character, "front/forward", in place of what
// every other row in this column uses: MLV, ELV, MLV/ELV, or 0-10V).
// Corrected here to "MLV/ELV" as the overwhelmingly likely intended value
// (it's the only other value already used elsewhere in this same column
// for a dual-compatible dimmer, e.g. EATON's AAL06) — flagged in a footnote
// on the page itself rather than silently fixed with no trace, since this
// is a transcription call, not confirmed with the vendor.
//
// "Heavenly power source" is transcribed verbatim as the vendor's own
// brand name in the source file, not AMBLUX's phrasing.
export interface DimmerModel {
  model: string;
  input: string;
  range: string;
  type: string;
  note?: string;
}

export interface DimmerBrandGroup {
  brand: string;
  models: DimmerModel[];
}

export const DIMMER_CHART_TEST_DATE = "2026-07-01";
export const DIMMER_CHART_SERIES = "MSA";

export const DIMMER_COMPATIBILITY_CHART: DimmerBrandGroup[] = [
  {
    brand: "Lutron",
    models: [
      { model: "SCL-153PR-WH", input: "100-130V", range: "0-100%", type: "MLV", note: "Minimum brightness adjustable from 0-30%" },
      { model: "DVCL-153PR-WH", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "CTCL-153PDH-LA", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "TGCL-153PH-WH", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "CT-600PR-IV", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "CT-103PR-WH", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "S-600PR-WH", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "MRF2-6ND-120-AL", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "MRF2-6ELV-120", input: "100-130V", range: "0-100%", type: "ELV" },
      { model: "NTLV-600-277-WH", input: "277V", range: "1-100%", type: "MLV" },
      { model: "NTF-10-277", input: "277V", range: "1-100%", type: "MLV" },
      { model: "DVCL-253PR-WH", input: "100-130V", range: "0-100%", type: "MLV", note: "Minimum brightness adjustable from 0-30%" },
      { model: "SELV-300P", input: "100-130V", range: "1-100%", type: "ELV" },
      { model: "PD-10NXD", input: "100-130V", range: "1-100%", type: "ELV" },
      { model: "MA-PRO-WH", input: "100-130V", range: "0-100%", type: "MLV/ELV", note: "Minimum brightness adjustable from 0-30% — see transcription note above" },
      { model: "C-600P", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "TG-600P", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "AY-600P", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "AY-603P-WH", input: "100-130V", range: "1-100%", type: "MLV/ELV", note: "See transcription note above" },
      { model: "D-600PH-DK", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "TG-603PH-WH", input: "100-130V", range: "1-100%", type: "MLV/ELV", note: "See transcription note above" },
      { model: "RRD-6NA", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "SW-600P", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "MA-R", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "GL-600", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "MAELV-600", input: "277V", range: "1-100%", type: "ELV" },
      { model: "DVLV-103P", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "SCL-453P", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "PD-5NE", input: "100-130V", range: "5-100%", type: "MLV" },
    ],
  },
  {
    brand: "Leviton",
    models: [
      { model: "TSL06-1LW", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "DSL06-1LZ", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "6672-1LZ", input: "100-130V", range: "0-100%", type: "MLV", note: "Minimum brightness adjustable from 0-30%" },
      { model: "IPE041LZ", input: "100-130V", range: "1-100%", type: "ELV" },
      { model: "DSE06-10Z", input: "100-130V", range: "1-100%", type: "ELV" },
      { model: "JW-0592", input: "100-130V", range: "0-100%", type: "ELV" },
      { model: "VPE04-1LZ", input: "100-130V", range: "1-100%", type: "ELV" },
      { model: "R62-6683-IW", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "6674-10W", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "IP710-DL", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "45163", input: "100-130V", range: "5-100%", type: "MLV" },
      { model: "TBL03", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "VPI06", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "IPL06", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "06672", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "HCM06", input: "100-130V", range: "5-100%", type: "MLV" },
      { model: "IP710-DL", input: "120V-277V", range: "1-100%", type: "MLV" },
    ],
  },
  {
    brand: "Legrand",
    models: [
      { model: "RH703PTUTCCCV4", input: "100-130V", range: "1-100%", type: "ELV" },
      { model: "RHCL453PGCCV4", input: "100-130V", range: "1-100%", type: "MLV" },
      { model: "90680W", input: "100-130V", range: "0-100%", type: "MLV" },
    ],
  },
  {
    brand: "Cooper",
    models: [
      { model: "SI10P-A", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "DI10P-A", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "SI061-V", input: "100-130V", range: "0-100%", type: "MLV" },
      { model: "9534DS-K", input: "100-130V", range: "0-100%", type: "ELV" },
      { model: "953OSG-K", input: "100-130V", range: "0-100%", type: "ELV" },
      { model: "TAL06P-LI-K-L", input: "100-130V", range: "0-100%", type: "MLV", note: "Minimum brightness adjustable from 0-30%" },
      { model: "DFS15P", input: "100-130V", range: "0-101%", type: "MLV" },
    ],
  },
  {
    brand: "Heavenly power source",
    models: [
      { model: "DNA042CU2-W-600-31A2-R", input: "100-130V", range: "0-100%", type: "ELV" },
      { model: "DNA03AU11-600-31B1", input: "100-130V", range: "0-100%", type: "MLV", note: "Minimum brightness adjustable from 0-30%" },
      { model: "DNA03FU1-600-31B1", input: "100-130V", range: "0-100%", type: "MLV", note: "Minimum brightness adjustable from 0-30%" },
      { model: "ANA030F1-600-34B1", input: "100-277V", range: "0-100%", type: "0-10V", note: "Minimum brightness adjustable from 0-30%" },
    ],
  },
  { brand: "Eaton", models: [{ model: "AAL06", input: "100-130V", range: "0-100%", type: "MLV/ELV" }] },
  { brand: "Credza", models: [{ model: "TT-300NL", input: "100-130V", range: "1-100%", type: "MLV" }] },
  { brand: "GE", models: [{ model: "ZW3003", input: "100-130V", range: "5-100%", type: "MLV" }] },
  { brand: "Ecohilux", models: [{ model: "IRDC-303TR", input: "100-130V", range: "1-100%", type: "MLV" }] },
];
