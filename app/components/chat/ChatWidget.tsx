"use client";

// The persistent AI chat assistant widget — a floating button (bottom-right
// on every screen size; full-screen panel on mobile, a docked card on
// desktop) that mounts once in the root layout. Only renders anything for
// a signed-in AMBLUX admin account during Stage 1 of the staged rollout
// (see lib/chat/useChatAccess.ts) — everyone else sees nothing, which
// matches "only clients with a login can use the chat" plus the current
// admin-only testing stage.
//
// The "current design" panel below the conversation is computed client-side
// from the shared project-state object using the exact same
// lib/configurator/engine.ts functions the graphical configurator already
// ships to the browser — no second BOM implementation, just a second place
// that calls the same one.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat, type ChatMessage } from "@/app/providers/ChatProvider";
import { useChatAccess } from "@/lib/chat/useChatAccess";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseUser } from "@/lib/supabase/useSupabaseUser";
import { saveQuote } from "@/lib/configurator/quotes";
import { computeBom, consolidatePartsByZone, type ZonePartsGroup } from "@/lib/configurator/engine";
import { mergeConfiguratorState, type ConfiguratorState } from "@/lib/configurator/types";

const STARTER_PROMPTS: { label: string; message: string }[] = [
  { label: "Design my lighting system", message: "I'd like to design a lighting system for a project." },
  { label: "Find the right product", message: "I'm trying to find the right AMBLUX product for what I need." },
  { label: "Technical help", message: "I have a technical question about installing or wiring AMBLUX products." },
  { label: "Replace/compare another product", message: "I want to find the AMBLUX equivalent for a competitor's product." },
];

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M4 12l16-7-6 16-2.5-6.5L4 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M4.5 12a7.5 7.5 0 1 1 2.4 5.5M4.5 12V7m0 5h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The conversation moves through the same coarse phases every time,
// regardless of how many zones end up in the project: greet -> pick one of
// the four starter paths -> guided per-zone Q&A -> a computed design to
// review. This is derived purely from state the app already has (message
// count + the shared project state's `selected` zones + whether
// computeDesign() below finds a real BOM) — it does not introduce any new
// persisted field or business rule, just a UI-only label for where in that
// flow the current conversation is.
type ChatPhase = "welcome" | "path" | "configuring" | "review";

const PHASE_STEPS: { key: ChatPhase; label: string }[] = [
  { key: "welcome", label: "Welcome" },
  { key: "path", label: "Pick a path" },
  { key: "configuring", label: "Configure your design" },
  { key: "review", label: "Review & next steps" },
];

function computePhase(messageCount: number, projectState: Record<string, unknown>, design: DesignSnapshot | null): ChatPhase {
  if (messageCount === 0) return "welcome";
  if (design) return "review";
  const selected = (projectState as { selected?: Record<string, unknown> } | undefined)?.selected;
  const hasSelection = !!selected && Object.values(selected).some(Boolean);
  return hasSelection ? "configuring" : "path";
}

function ProgressSteps({ phase }: { phase: ChatPhase }) {
  const currentIndex = Math.max(
    0,
    PHASE_STEPS.findIndex((s) => s.key === phase),
  );
  return (
    <div className="border-b border-border bg-background px-4 py-2">
      <div className="flex items-center gap-1.5">
        {PHASE_STEPS.map((step, i) => (
          <span key={step.key} className={`h-1 flex-1 rounded-full ${i <= currentIndex ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{PHASE_STEPS[currentIndex]?.label}</p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted/60"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-accent text-white" : "border border-border bg-surface text-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function downloadBom(groups: ZonePartsGroup[], projectName: string) {
  const lines: string[] = [`AMBLUX project — ${projectName || "Untitled project"}`, ""];
  groups.forEach((g) => {
    if (g.parts.length === 0) return;
    lines.push(g.zone.toUpperCase());
    g.parts.forEach((p) => lines.push(`  ${p.qty}x  ${p.sku}  — ${p.description}`));
    lines.push("");
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `amblux-bom-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Computed once per projectState change and shared by DesignSummary (the
// action panel) and the progress indicator above the message thread, so
// there's exactly one place in this file that turns the shared project
// state into a BOM — both call the same lib/configurator/engine.ts
// functions the graphical configurator uses, never a second implementation.
type DesignSnapshot = ReturnType<typeof computeDesignSnapshot>;

function computeDesignSnapshot(projectState: Record<string, unknown>) {
  if (!projectState || Object.keys(projectState).length === 0) return null;
  try {
    const fullState = mergeConfiguratorState(projectState as Partial<ConfiguratorState>);
    const bom = computeBom(fullState);
    if (bom.rows.length === 0) return null;
    return { fullState, bom, projectName: fullState.project.name, groups: consolidatePartsByZone(bom), totalWatts: bom.total };
  } catch {
    return null;
  }
}

function DesignSummary({
  design,
  onStartOver,
  onAddZone,
  onRequestReview,
}: {
  design: DesignSnapshot | null;
  onStartOver: () => void;
  onAddZone: () => void;
  onRequestReview: () => void;
}) {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const [openingConfigurator, setOpeningConfigurator] = useState(false);
  const [openError, setOpenError] = useState(false);

  if (!design) return null;

  // Hands this chat-built design off to the real graphical configurator by
  // saving it through the exact same amblux_quotes save path the
  // configurator's own "Save" button uses (lib/configurator/quotes.ts), then
  // deep-linking to the wizard's existing `?quote=<id>` loader
  // (ConfiguratorClient.tsx already supports this — see its own comment on
  // that effect). No new save/load logic, no second state format — this
  // reuses the one path that already exists.
  async function handleOpenInConfigurator() {
    if (!user || !design) return;
    setOpeningConfigurator(true);
    setOpenError(false);
    try {
      const supabase = createClient();
      const { id } = await saveQuote(supabase, { id: null, accountId: user.id, state: design.fullState, bom: design.bom });
      router.push(`/configurator?quote=${id}`);
    } catch {
      setOpenError(true);
    } finally {
      setOpeningConfigurator(false);
    }
  }

  return (
    <div className="mx-4 mb-3 rounded-xl bg-foreground p-4 text-white">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-soft">Current design</p>
        <span className="text-xs text-white/60">{Math.round(design.totalWatts * 10) / 10} W</span>
      </div>
      <div className="mt-3 max-h-48 overflow-y-auto pr-1 text-sm">
        {design.groups
          .filter((g) => g.parts.length > 0)
          .map((g) => (
            <div key={g.zone} className="mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-soft">{g.zone}</p>
              {g.parts.map((p) => {
                const optional = p.description.includes("· optional");
                return (
                  <div key={p.sku} className="flex items-start justify-between gap-2 py-0.5 text-white/85">
                    <span className="font-mono text-[11px] text-accent-soft">{p.qty}×</span>
                    <span className="flex-1">
                      {p.description}
                      {optional && <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60">optional</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleOpenInConfigurator}
          disabled={openingConfigurator}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-strong disabled:cursor-wait disabled:opacity-60"
        >
          {openingConfigurator ? "Opening…" : "Open in configurator"}
        </button>
        <button
          type="button"
          onClick={() => downloadBom(design.groups, design.projectName)}
          className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-white"
        >
          Download BOM
        </button>
        <button type="button" onClick={onAddZone} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20">
          Add another zone
        </button>
        <button type="button" onClick={onRequestReview} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20">
          Request specialist review
        </button>
        <button type="button" onClick={onStartOver} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20">
          Start another project
        </button>
      </div>
      {openError && <p className="mt-2 text-xs text-amber-300">Couldn&apos;t open the configurator just now — please try again.</p>}
    </div>
  );
}

function ReviewRequestForm({ onSubmit, onCancel }: { onSubmit: (text: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form
      className="mx-4 mb-3 space-y-2 rounded-xl border border-border bg-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) return;
        onSubmit(
          `Please request an AMBLUX specialist review for this project. Name: ${name.trim()}. Email: ${email.trim()}.${phone.trim() ? ` Phone: ${phone.trim()}.` : ""}${notes.trim() ? ` Notes: ${notes.trim()}` : ""}`,
        );
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Request a specialist review</p>
      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input
        type="email"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <textarea
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        placeholder="Anything else to add? (optional)"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-strong">
          Send request
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ChatWidget() {
  const { enabled } = useChatAccess();
  const { isOpen, toggle, close, messages, projectState, isSending, error, sendMessage, resetConversation } = useChat();
  const [draft, setDraft] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const confirmResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => () => {
    if (confirmResetTimeout.current) clearTimeout(confirmResetTimeout.current);
  }, []);

  const design = useMemo(() => computeDesignSnapshot(projectState), [projectState]);
  const phase = computePhase(messages.length, projectState, design);

  if (!enabled) return null;

  const handleSend = () => {
    if (!draft.trim()) return;
    void sendMessage(draft);
    setDraft("");
  };

  // Resetting mid-conversation (not just from the post-design "Start another
  // project" button) discards the in-progress chat and shared project state,
  // so this asks for one extra click within 3s to confirm rather than firing
  // on a single accidental tap right next to Close.
  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      confirmResetTimeout.current = setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    if (confirmResetTimeout.current) clearTimeout(confirmResetTimeout.current);
    setConfirmReset(false);
    resetConversation();
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Open AMBLUX Assistant"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105 hover:bg-accent-strong sm:bottom-6 sm:right-6"
      >
        <ChatIcon />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden border-border bg-surface shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[38rem] sm:max-h-[85vh] sm:w-[26rem] sm:rounded-2xl sm:border">
      <div className="flex items-center justify-between bg-foreground px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">AMBLUX Assistant</p>
          <p className="text-xs text-accent-soft">Ask about products, or design a lighting system</p>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleResetClick}
              aria-label={confirmReset ? "Click again to confirm reset" : "Reset conversation"}
              title={confirmReset ? "Click again to confirm" : "Reset conversation"}
              className={`rounded-full p-1.5 transition-colors ${
                confirmReset ? "bg-amber-400/20 text-amber-200" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ResetIcon />
            </button>
          )}
          <button type="button" onClick={close} aria-label="Close" className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
            <CloseIcon />
          </button>
        </div>
      </div>

      {messages.length > 0 && <ProgressSteps phase={phase} />}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-muted">Hi — I&apos;m the AMBLUX assistant. What would you like to do?</p>
            <div className="mt-3 flex flex-col gap-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => void sendMessage(p.message)}
                  className="rounded-full border border-accent-soft/50 bg-background px-4 py-2 text-left text-sm text-foreground transition-colors hover:border-accent hover:bg-accent/5"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {isSending && <TypingIndicator />}
        {error && <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}
      </div>

      {showReviewForm ? (
        <ReviewRequestForm
          onSubmit={(text) => {
            setShowReviewForm(false);
            void sendMessage(text);
          }}
          onCancel={() => setShowReviewForm(false)}
        />
      ) : (
        <DesignSummary
          design={design}
          onStartOver={resetConversation}
          onAddZone={() => void sendMessage("I'd like to add another zone to this project.")}
          onRequestReview={() => setShowReviewForm(true)}
        />
      )}

      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !draft.trim()}
          aria-label="Send"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
