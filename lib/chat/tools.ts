// Tool definitions + server-side execution for the AI chat assistant.
//
// Hard rule this file exists to enforce: the AI never computes BOM/SKU/
// wattage/driver math itself — it only ever sees the *results* of calling
// these tools. compute_bom below is a thin wrapper around the exact same
// lib/configurator/engine.ts functions the graphical configurator uses
// (mergeConfiguratorState + computeBom + consolidatePartsByZone) — there is
// no second copy of that math anywhere in the chat layer. Likewise
// get_zone_catalog/get_linear_family_options read the same database-backed
// rule book (lib/chat/catalogRules.ts) that mirrors lib/configurator/
// catalog.ts, so the model is only ever told about zones/controls/products
// that really exist and are currently sellable (hidden/coming_soon SKUs are
// already filtered out at that layer — see catalogRules.ts's header).
import { computeBom, consolidatePartsByZone } from "@/lib/configurator/engine";
import { mergeConfiguratorState, type ConfiguratorState } from "@/lib/configurator/types";
import { loadCatalogRules } from "@/lib/chat/catalogRules";
import { sendLeadHandoffEmail } from "@/lib/email";

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
      "Returns the real list of AMBLUX project zones (undercabinet, toe kick, crown, base cabinet, wall cabinet, floating shelves, pantry, drawers, high cabinet, library, closet hangers, shoe rack, vanity, mirror, floating cabinet), which zones apply to which project application (kitchen/bathroom/closets/furniture), the display name for each zone, and the real control options available per zone/control-system. Call this before asking the customer about zones or controls so you only ever offer choices that really exist — never invent a zone or control name.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_linear_family_options",
    description:
      "Returns the real AMBLUX linear (tape/extrusion) product families available for a given mounting type, with their real color-temperature (CCT) and stock-length options. Call this before asking the customer to choose a linear product line, CCT, or length — never invent a product family, CCT, or length that isn't returned here.",
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
    name: "compute_bom",
    description:
      "The ONLY way to calculate a real bill of materials, SKU, quantity, wattage, or driver/receiver sizing. Never estimate or state any of these yourself — always call this tool. Pass a (partial is fine) AMBLUX project configuration object: { project: { application: 'kitchen'|'bathroom'|'closets'|'furniture', name, client, location, email, phone, ... }, selected: { undercabinet: true, base: true, ... — boolean per zone key from get_zone_catalog }, simple: { undercabinet: { zoneCount, zoneLengths: [in inches unless unit is set], unit, cct, linearFamily, control, controlSystem, mounting, ... }, toeKick: {...}, crown: {...}, floatingCabinet: {...}, mirror: {...} }, base/wall/floating/pantry/highCabinet/library/closetHangers/shoeRack: { controlSystem, control, powerType, blocks: [ { included: true, mode: 'shelf'|'vertical', mounting, height, shelves, length, linearFamily, cct, ... } ] }, drawers: { control, blocks: [{ included, count, length, linearFamily, mounting, cct }] }, vanity: { blocks: [{ included, doorsInclude, drawersInclude, floatingInclude, ... }] } }. Only include the fields the customer has actually specified or confirmed — this call is cumulative across the conversation (each call merges onto what was set in earlier calls), so you never need to re-send the whole thing from scratch. Returns the full resolved configuration plus the computed bill of materials grouped by zone (real SKUs, descriptions, quantities). If a selection is invalid or incomplete, this returns an error message explaining what's missing or wrong — ask the customer for that instead of guessing.",
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
        return {
          content: JSON.stringify({
            zones: snapshot.zones,
            zoneNames: snapshot.zoneNames,
            zonesByApplication: snapshot.zonesByApplication,
            controlOptions: snapshot.controlOptions,
            controlLabels: snapshot.controlLabel,
            undercabinetRemoteControls: snapshot.undercabinetRemoteControls,
            maxShelvesByZone: snapshot.maxShelvesByZone,
            defaultCountCap: snapshot.defaultCountCap,
            linearOnlyZones: snapshot.linearOnlyZones,
          }),
        };
      }

      case "get_linear_family_options": {
        const snapshot = await loadCatalogRules();
        const mounting = input.mounting as "recess" | "surface";
        const mode = input.mode as "shelf" | "vertical" | undefined;
        const families = snapshot.linearFamilies.filter((f) => f.mounting === mounting && (mode === "vertical" ? f.verticalCapable : !f.verticalOnly));
        const ccts = ["3000", "4000"] as const;
        return {
          content: JSON.stringify(
            families.map((f) => ({
              id: f.id,
              label: f.label,
              type: f.type,
              wattsPerMetre: f.wattsPerMetre,
              verticalCapable: f.verticalCapable,
              lengthsByCct: Object.fromEntries(
                ccts.map((c) => [
                  c,
                  Object.keys(f.skusByCctAndLength[c] ?? {})
                    .map(Number)
                    .sort((a, b) => a - b),
                ]),
              ),
            })),
          ),
        };
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
