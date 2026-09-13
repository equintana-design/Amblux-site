"use client";

// Shared state for the AI chat assistant — the client-side half of the
// "chat and configurator share ONE underlying project object" requirement.
// `projectState` here is the same ConfiguratorState shape (partial) the
// graphical configurator uses; /api/chat's tool loop (lib/chat/tools.ts)
// merges onto it via mergeConfiguratorState() every time compute_bom runs,
// and the (possibly updated) result is echoed back and stored here. A
// future pass can point the graphical configurator's own state at this same
// context so editing one updates the other live — this provider's shape is
// already the connective tissue for that, it just isn't wired into
// ConfiguratorClient.tsx yet.
//
// Persisted to localStorage (mirrors app/providers/TestProjectProvider.tsx's
// hydration pattern) so a page refresh doesn't lose an in-progress
// conversation — reasonable for Stage 1 admin testing; a signed-in-account
// server-side history can replace this later without changing the
// context's shape.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: ChatMessage[];
  projectState: Record<string, unknown>;
  isSending: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  resetConversation: () => void;
}

const STORAGE_KEY = "amblux-chat";

interface StoredShape {
  messages: ChatMessage[];
  state: Record<string, unknown>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [projectState, setProjectState] = useState<Record<string, unknown>>({});
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredShape>;
        if (Array.isArray(parsed.messages)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system) on mount, same exception TestProjectProvider relies on.
          setMessages(parsed.messages);
        }
        if (parsed.state && typeof parsed.state === "object") setProjectState(parsed.state);
      }
    } catch {
      // Corrupt or inaccessible storage — start with a fresh conversation.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const toStore: StoredShape = { messages, state: projectState };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // Storage full or disabled — the conversation still works for the
      // rest of this session, it just won't survive a refresh.
    }
  }, [messages, projectState, hydrated]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sendingRef.current) return;
      sendingRef.current = true;
      setIsSending(true);
      setError(null);

      const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
      setMessages(nextMessages);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages, state: projectState }),
        });
        if (!res.ok) {
          const bodyText = await res.text().catch(() => "");
          throw new Error(bodyText || `The assistant is unavailable right now (${res.status}).`);
        }
        const data = (await res.json()) as { reply: string; state?: Record<string, unknown> };
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (data.state) setProjectState(data.state);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      } finally {
        sendingRef.current = false;
        setIsSending(false);
      }
    },
    [messages, projectState],
  );

  const resetConversation = useCallback(() => {
    setMessages([]);
    setProjectState({});
    setError(null);
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
      messages,
      projectState,
      isSending,
      error,
      sendMessage,
      resetConversation,
    }),
    [isOpen, messages, projectState, isSending, error, sendMessage, resetConversation],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
