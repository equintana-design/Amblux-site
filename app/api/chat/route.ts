// POST /api/chat — the AI chat assistant's only server endpoint.
//
// Access: Stage 1 of the staged rollout agreed with the site owner
// (2026-09-13) — admin-only (amblux_profiles.role === "admin" && approved).
// Stage 2 will add a per-account "chat tester" flag; Stage 3 opens this to
// any approved, signed-in account. Nothing below should assume "admin"
// forever — the check is isolated in isAuthorized() below for that reason.
//
// This route holds the ONLY Anthropic API key usage in the app — the
// browser never sees it. It also never computes BOM/pricing/catalog logic
// itself: every real fact or calculation the model needs comes from the
// tools in lib/chat/tools.ts, which call the exact same lib/configurator/
// engine.ts functions (and database-backed catalog rules) the graphical
// configurator already uses. See lib/chat/systemPrompt.ts for the model's
// instructions.
import { createClient } from "@/lib/supabase/server";
import { CHAT_TOOLS, executeTool, type ToolExecutionContext } from "@/lib/chat/tools";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/systemPrompt";

export const runtime = "nodejs";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
// Overridable without a code deploy via ANTHROPIC_CHAT_MODEL — see the
// "waiting on you" note this shipped with. Kept as a plain string rather
// than pinned in a comment claiming permanence: model names move forward
// over time, so if this ever looks stale, check console.anthropic.com's
// model picker for the current name rather than assuming this is current.
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 2048;
// Hard ceiling on tool round-trips within one request — a well-behaved
// conversation turn needs at most a handful of tool calls; this exists only
// to guarantee the request can't loop forever (and keep API cost bounded)
// if the model gets stuck calling tools.
const MAX_TOOL_ITERATIONS = 8;

interface ChatContentBlock {
  type: string;
  [key: string]: unknown;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ChatContentBlock[];
}

interface ChatRequestBody {
  // Plain display transcript from the client — no tool_use/tool_result
  // plumbing. The server reconstructs and discards that internally per
  // request; nothing about the tool loop is persisted or replayed by the
  // client. Keeping the wire format this simple was a deliberate choice
  // (see "keep the architecture simple") — richer server-side conversation
  // persistence can be added later without changing this contract.
  messages: { role: "user" | "assistant"; content: string }[];
  // The project configuration built up so far (or undefined for a brand
  // new conversation) — same shape the graphical configurator uses. Echoed
  // back (possibly updated) in the response so the client can keep both in
  // sync.
  state?: Record<string, unknown>;
}

async function isAuthorized(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase.from("amblux_profiles").select("role, approved").eq("id", user.id).single();
  return !!profile && profile.role === "admin" && profile.approved === true;
}

async function callAnthropic(messages: AnthropicMessage[], apiKey: string): Promise<{
  content: ChatContentBlock[];
  stop_reason: string;
}> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_CHAT_MODEL || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: CHAT_SYSTEM_PROMPT,
      messages,
      tools: CHAT_TOOLS,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API returned ${res.status}: ${body}`);
  }

  return res.json();
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return new Response("Not authorized — this assistant is currently limited to AMBLUX admin testing.", { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      "The chat assistant is not configured yet — ANTHROPIC_API_KEY is missing on the server.",
      { status: 500 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response('Request body must include a non-empty "messages" array.', { status: 400 });
  }

  const messages: AnthropicMessage[] = body.messages.map((m) => ({ role: m.role, content: m.content }));

  let workingState: Record<string, unknown> = body.state ?? {};
  const ctx: ToolExecutionContext = {
    getState: () => workingState,
    setState: (next) => {
      workingState = next;
    },
  };

  let finalText = "";
  try {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await callAnthropic(messages, apiKey);

      if (response.stop_reason !== "tool_use") {
        finalText = response.content
          .filter((block): block is ChatContentBlock & { text: string } => block.type === "text" && typeof block.text === "string")
          .map((block) => block.text)
          .join("\n\n");
        break;
      }

      // Assistant's tool_use turn goes back onto the transcript verbatim,
      // then one tool_result per tool_use block, in the same order —
      // exactly what the Anthropic API requires for a valid follow-up call.
      messages.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
      const toolResults: ChatContentBlock[] = [];
      for (const block of toolUseBlocks) {
        const toolUseId = block.id as string;
        const toolName = block.name as string;
        const toolInput = (block.input as Record<string, unknown>) ?? {};
        const result = await executeTool(toolName, toolInput, ctx);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUseId,
          content: result.content,
          ...(result.isError ? { is_error: true } : {}),
        });
      }
      messages.push({ role: "user", content: toolResults });

      if (iteration === MAX_TOOL_ITERATIONS - 1) {
        finalText = "I ran into trouble finishing that — could you try rephrasing or breaking it into a smaller step?";
      }
    }
  } catch (err) {
    return new Response(`Chat assistant error: ${err instanceof Error ? err.message : String(err)}`, { status: 502 });
  }

  return Response.json({ reply: finalText, state: workingState });
}
