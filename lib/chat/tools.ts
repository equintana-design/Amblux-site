// Tool definitions + server-side execution for the AI chat assistant.
//
// Hard rule this file exists to enforce: the AI never computes BOM/SKU/
// wattage/driver math itself — it only ever sees the *results* of calling
// these tools. compute_bom below is a thin wrapper around the exact same
// lib/configurator/engine.ts functions the graphical configurator uses
// (mergeConfiguratorState + computeBom + consolidatePartsByZone) — there is
// no second copy of that math anywhere in the chat layer. Likewise
// get_zone_catalog/get_linear_family_options read lib/chat/catalogRules.ts,
// which (as of 2026-09-13) imports lib/configurator/catalog.ts directly
// rather than a separately-seeded database copy — see catalogRules.ts's own
// header for why (a stale copy previously caused two real bugs: a hand-
// rolled reimplementation of linearFamiliesFor(), and puck lighting never
// being exposed to the model at all even though it's a real AMBLUX option
// for several zones). Live product status (hidden/coming_soon) still comes
// from a real-time database query — that part genuinely can't come from
// static code.
import { computeBom, consolidatePartsByZone } from "@/lib/configurator/engine";
import { mergeConfiguratorState, type ConfiguratorState } from "@/lib/configurator/types";
import { loadCatalogRules, usableLinearFamilies, puckOption } from "@/lib/chat/catalogRules";
import { sendLeadHandoffEmail } from "@/lib/email";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

// 2026-09-13: get_zone_catalog used to always return catalog.ts's English
// zoneNames, regardless of the site's own EN/FR/ES language switcher — so
// even once the assistant's replies started following the site's selected
// language, it kept inventing its own translation of zone/finish names
// instead of using the configurator's own approved wording (e.g. "Éclairage
// sous armoire" for under-cabinet in French — already translated in
// lib/i18n/dictionaries.ts, just never read from here). These two helpers
// look those exact strings up by locale so the chat and the graphical
// configurator always say the same thing for the same zone/finish.
function localizedZoneNames(locale: Locale): Record<string, string> {
  return dictionaries[locale].configurator.zoneNames;
}

// Puck finish keys (white/satinNickel/black/chrome) are stored as flat
// top-level keys under the configurator namespace (see dictionaries.ts,
// same keys lib/configurator/labels.ts's LABELS.finish uses internally for
// English-only BOM text) — this just looks each one up per locale, falling
// back to the raw key if a key is ever added to catalog.ts before its
// translation is.
function localizedFinishLabels(locale: Locale, keys: string[]): Record<string, string> {
  const table = dictionaries[locale].configurator as unknown as Record<string, string>;
  const out: Record<string, string> = {};
  for (const key of keys) out[key] = table[key] ?? key;
  return out;
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolExecutionContext {
  // The project configuration this chat conversation has built up so far,
  // shared across every tool call in the request and handed back to the
  // client at the end so the graphical configurator can be kept in sync
  // with whatever the chat has decided — this IS the "one shared project
  // object" the chat-assistant spec requires, not a parallel copy of it.
  getState(): Record<string, unknown>;
  setState(next: Record<string, unknown>): void;
  // The site's currently selected language (see systemPrompt.ts's
  // buildSystemPrompt) — get_zone_catalog uses this to return zone/finish
  // names in the same language and wording the graphical configurator
  // itself uses, instead of catalog.ts's English-only internal names.
  locale: Locale;
}

export interface ToolResult {
  content: string;
  isError?: boolean;
}

// Recursively merges `patch` onto `base`, keeping any key `patch` doesn't
// mention. Arrays replace wholesale rather than merging element-by-element
// (a `zoneLengths`/`blocks` array from the model always means "this is the
// full array now", never "splice these values in"). This is state
// *accumulation* across chat turns, not catalog/BOM logic — the actual
// defaulting/validation of the merged result still happens in
// mergeConfiguratorState() below, exactly as it does for a loaded quote.
function deepMerge(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return base;
  if (Array.isArray(patch)) return patch;
  if (patch && typeof patch === "object" && base && typeof base === "object" && !Array.isArray(base)) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const key of Object.keys(patch as Record<string, unknown>)) {
      out[key] = deepMerge((base as Record<string, unknown>)[key], (patch as Record<string, unknown>)[key]);
    }
    return out;
  }
  return patch;
}

export const CHAT_TOOLS: AnthropicTool[] = [
  {
    name: "get_zone_catalog",
    description:
      "Returns the real list of AMBLUX project zones (undercabinet, toe kick, crown, base cabinet, wall cabinet, floating shelves, pantry, drawers, high cabinet, library, closet hangers, shoe rack, vanity, mirror, floating cabinet), which zones apply to which project application (kitchen/bathroom/closets/furniture), the display name for each zone (zoneNames — already in the customer's currently selected site language, matching the graphical configurator's own wording exactly; always use these exact strings, never your own translation), the real control options available per zone/control-system, which zones have a shelf-vs-vertical/gable Layout choice at all (verticalCapableZones — base, wall, pantry, high cabinet, library, closet hangers, shoe rack; a zone not in this list is always shelf-orientation, e.g. undercabinet/floating shelves, or has no shelf/gable concept at all, e.g. toe kick/crown/drawers/vanity/mirror/floating cabinet), which zones support puck fixtures as an alternative to linear tape/extrusion (see puckCapableZones — a zone not in that list and not in linearOnlyZones is simply always linear, it has no light-type choice at all; note puck is only ever available in shelf-mode — a zone with the vertical/gable Layout chosen is always linear regardless of puckCapableZones), the real puck finish keys by mounting (puckFinishes — pass these keys back as-is in compute_bom's puckFinish field), and the matching display name for each finish key already in the customer's language (puckFinishLabels). Call this before asking the customer about zones, controls, layout, or light type so you only ever offer choices that really exist — never invent a zone, control name, layout, or light-type option (in particular: never assume puck lighting doesn't exist for a zone, or does exist for a zone not listed in puckCapableZones).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_linear_family_options",
    description:
      "Returns the real AMBLUX linear (tape/extrusion) product families available for a given mounting type, with their real color-temperature (CCT) and stock-length options. Call this before asking the customer to choose a linear product line, CCT, or length — never invent a product family, CCT, or length that isn't returned here. Only relevant once the customer has chosen (or the zone forces) linear lighting rather than puck — see get_zone_catalog's puckCapableZones and get_puck_option.",
    input_schema: {
      type: "object",
      properties: {
        mounting: { type: "string", enum: ["recess", "surface"], description: "Recessed (inside the cabinet/profile) or surface-mounted." },
        mode: { type: "string", enum: ["shelf", "vertical"], description: "Optional. 'vertical' restricts to families usable for vertical/gable side-panel lighting; omit for the normal shelf/run list." },
      },
      required: ["mounting"],
    },
  },
  {
    name: "get_puck_option",
    description:
      "Returns the real puck-fixture wattage and current sellability for a given mounting, for a zone that supports puck lighting (see get_zone_catalog's puckCapableZones). Call this once the customer has chosen puck over linear for a puck-capable zone, so you can tell them the real finish choices (from get_zone_catalog's puckFinishes) and confirm the fixture is currently sellable before finalizing.",
    input_schema: {
      type: "object",
      properties: {
        mounting: { type: "string", enum: ["recess", "surface"], description: "Recessed (in a routed channel, with a faceplate finish) or surface-mounted (visible puck body finish)." },
      },
      required: ["mounting"],
    },
  },
  {
    name: "compute_bom",
    description:
      "The ONLY way to calculate a real bill of materials, SKU, quantity, wattage, or driver/receiver sizing. Never estimate or state any of these yourself — always call this tool. Pass a (partial is fine) AMBLUX project configuration object: { project: { application: 'kitchen'|'bathroom'|'closets'|'furniture', name, client, location, email, phone, ... }, selected: { undercabinet: true, base: true, ... — boolean per zone key from get_zone_catalog }, simple: { undercabinet: { zoneCount, zoneLengths: [in inches unless unit is set], unit, cct, lightType: 'puck'|'linear' (undercabinet only — see get_zone_catalog's puckCapableZones; if 'puck', also set puckFinish and skip linearFamily), linearFamily, puckFinish, control, controlSystem, mounting, ... }, toeKick: {...}, crown: {...}, floatingCabinet: {...}, mirror: {...} — these four never support puck, always linear regardless of any lightType value }, base/wall/floating/pantry/highCabinet/library/closetHangers/shoeRack: { controlSystem, control, powerType, blocks: [ { included: true, mode: 'shelf'|'vertical' (puck only ever applies in 'shelf' mode), mounting, height, shelves, length, lightType: 'puck'|'linear' (only for zones in puckCapableZones — closetHangers/shoeRack are linear-only, never set lightType:'puck' for those), linearFamily, puckFinish, cct, ... } ] }, drawers: { control, blocks: [{ included, count, length, linearFamily, mounting, cct }] } (drawers is always linear, no lightType), vanity: { blocks: [{ included, doorsInclude, drawersInclude, floatingInclude, ... }] } (vanity is always linear, no lightType) }. Only include the fields the customer has actually specified or confirmed — this call is cumulative across the conversation (each call merges onto what was set in earlier calls), so you never need to re-send the whole thing from scratch. Returns the full resolved configuration plus the computed bill of materials grouped by zone (real SKUs, descriptions, quantities). If a selection is invalid or incomplete, this returns an error message explaining what's missing or wrong — ask the customer for that instead of guessing.",
    input_schema: {
      type: "object",
      properties: {
        state: {
          type: "object",
          description: "A partial AMBLUX ConfiguratorState object — see this tool's description for the shape. Omit anything not yet decided.",
        },
      },
      required: ["state"],
    },
  },
  {
    name: "request_specialist_review",
    description:
      "Sends a real notification email asking an AMBLUX lighting specialist to review this project with the customer. Use this when the customer asks to speak with a person, when you cannot confidently finish a request with the tools/data available, or when the customer explicitly wants a formal quote. Never invent contact details — only call this once you actually have the customer's name and email (everything else is optional). If a project configuration has been built up in this conversation, its current BOM is automatically attached — you don't need to summarize it yourself.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        projectName: { type: "string" },
        location: { type: "string" },
        notes: { type: "string", description: "Anything the customer wants the specialist to know." },
        reasonForHandoff: { type: "string", description: "Why you (the assistant) are escalating this, if AI-initiated rather than customer-requested." },
      },
      required: ["name", "email"],
    },
  },
];

export async function executeTool(name: string, input: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult> {
  try {
    switch (name) {
      case "get_zone_catalog": {
        const snapshot = await loadCatalogRules();
        const allFinishKeys = [...snapshot.puckFinishes.recess, ...snapshot.puckFinishes.surface];
        return {
          content: JSON.stringify({
            zones: snapshot.zones,
            // Localized to ctx.locale (the site's current EN/FR/ES
            // selection) using the exact same wording as the graphical
            // configurator — see localizedZoneNames() above — not
            // catalog.ts's internal English-only names.
            zoneNames: localizedZoneNames(ctx.locale),
            zonesByApplication: snapshot.zonesByApplication,
            controlOptions: snapshot.controlOptions,
            controlLabels: snapshot.controlLabel,
            undercabinetRemoteControls: snapshot.undercabinetRemoteControls,
            maxShelvesByZone: snapshot.maxShelvesByZone,
            defaultCountCap: snapshot.defaultCountCap,
            linearOnlyZones: snapshot.linearOnlyZones,
            puckCapableZones: snapshot.puckCapableZones,
            verticalCapableZones: snapshot.verticalCapableZones,
            puckFinishes: snapshot.puckFinishes,
            puckFinishLabels: localizedFinishLabels(ctx.locale, allFinishKeys),
          }),
        };
      }

      case "get_linear_family_options": {
        const snapshot = await loadCatalogRules();
        const mounting = input.mounting as "recess" | "surface";
        const mode = input.mode as "shelf" | "vertical" | undefined;
        return { content: JSON.stringify(usableLinearFamilies(snapshot, mounting, mode)) };
      }

      case "get_puck_option": {
        const snapshot = await loadCatalogRules();
        const mounting = input.mounting as "recess" | "surface";
        return { content: JSON.stringify(puckOption(snapshot, mounting)) };
      }

      case "compute_bom": {
        const patch = (input.state ?? {}) as Record<string, unknown>;
        const accumulated = deepMerge(ctx.getState(), patch) as Record<string, unknown>;
        ctx.setState(accumulated);

        const fullState = mergeConfiguratorState(accumulated as Partial<ConfiguratorState>);
        let bom;
        try {
          bom = computeBom(fullState);
        } catch (err) {
          return {
            isError: true,
            content: `Could not compute a bill of materials with the current selections: ${err instanceof Error ? err.message : String(err)}. Ask the customer for the missing or conflicting detail rather than guessing a value.`,
          };
        }
        const grouped = consolidatePartsByZone(bom);
        return {
          content: JSON.stringify({
            state: fullState,
            bomByZone: grouped,
            totalLineItems: bom.rows.length,
          }),
        };
      }

      case "request_specialist_review": {
        const state = ctx.getState();
        let bomSummary: string | undefined;
        if (state && Object.keys(state).length > 0) {
          try {
            const fullState = mergeConfiguratorState(state as Partial<ConfiguratorState>);
            const grouped = consolidatePartsByZone(computeBom(fullState));
            bomSummary = grouped
              .filter((g) => g.parts.length > 0)
              .map((g) => `${g.zone}:\n` + g.parts.map((p) => `  ${p.qty}x ${p.sku} — ${p.description}`).join("\n"))
              .join("\n\n");
          } catch {
            bomSummary = undefined; // No usable BOM yet — the handoff still proceeds without one.
          }
        }

        const result = await sendLeadHandoffEmail({
          contact: {
            name: String(input.name ?? ""),
            company: input.company ? String(input.company) : undefined,
            email: String(input.email ?? ""),
            phone: input.phone ? String(input.phone) : undefined,
            projectName: input.projectName ? String(input.projectName) : undefined,
            location: input.location ? String(input.location) : undefined,
            notes: input.notes ? String(input.notes) : undefined,
          },
          bomSummary,
          reasonForHandoff: input.reasonForHandoff ? String(input.reasonForHandoff) : undefined,
        });

        if (!result.ok) {
          return { isError: true, content: `Failed to send the specialist review request: ${result.error}` };
        }
        return { content: "The specialist review request was sent. Let the customer know someone from AMBLUX will follow up." };
      }

      default:
        return { isError: true, content: `Unknown tool "${name}".` };
    }
  } catch (err) {
    return { isError: true, content: `Tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
