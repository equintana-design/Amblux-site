// Server-only transactional email sending via Resend's HTTP API.
//
// This is deliberately a plain fetch() call, not the `resend` npm package —
// this app has no AI-SDK/Resend dependencies installed yet, and one HTTP
// call doesn't justify adding one (see the "keep the architecture simple"
// steer from the chat-assistant planning conversation). If email needs
// (templates, attachments, batch sends) grow later, revisit that call.
//
// Import this ONLY from server-side code (Route Handlers, Server Actions,
// server-only lib modules) — RESEND_API_KEY must never reach the browser.
//
// Uses the same verified sending domain already set up for Supabase auth
// emails (see claude/resend-smtp-setup.md in the project docs): amblux.com,
// sender "AMBLUX <no-reply@amblux.com>". No new domain verification needed.

const RESEND_API_URL = "https://api.resend.com/emails";

// Confirmed with the site owner (2026-09-13): lead-handoff notifications go
// to the admin address on file until a dedicated sales/leads inbox exists.
// Overridable via env var so that change never needs a code deploy.
const DEFAULT_LEAD_NOTIFICATION_EMAIL = "equintana@amblux.com";

function leadNotificationEmail(): string {
  return process.env.LEAD_NOTIFICATION_EMAIL?.trim() || DEFAULT_LEAD_NOTIFICATION_EMAIL;
}

export interface LeadHandoffContact {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  projectName?: string;
  location?: string;
  notes?: string;
}

export interface LeadHandoffInput {
  contact: LeadHandoffContact;
  // Already-formatted plain-text/markdown-ish summary of the current BOM,
  // produced by the chat/configurator layer. This file intentionally does
  // NOT know how to render a BOM itself — that would duplicate formatting
  // logic that belongs with the one shared BOM source of truth
  // (lib/configurator/engine.ts / the future chat BOM step), not here.
  bomSummary?: string;
  // Short note on what the AI assistant could not confidently complete,
  // when the handoff was AI-initiated rather than customer-initiated.
  reasonForHandoff?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(escaped: string): string {
  return escaped.replace(/\n/g, "<br />");
}

// Low-level sender — any future transactional email (order confirmations,
// quote-ready notices, etc.) can call this directly instead of duplicating
// the fetch() plumbing; sendLeadHandoffEmail() below is the first caller.
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  from?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "sendEmail() requires RESEND_API_KEY to be set as a server-only environment variable " +
        "(create an API key at resend.com/api-keys and add it in Vercel's project settings).",
    );
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from ?? "AMBLUX <no-reply@amblux.com>",
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Resend API returned ${res.status}: ${body}` };
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: data.id };
}

// Sends the "please have a specialist review this project" notification —
// the human-handoff path from the AI chat assistant spec. Does NOT decide
// *when* to hand off (that's the chat's own logic); this just delivers the
// email once the chat/customer has decided to.
export async function sendLeadHandoffEmail(input: LeadHandoffInput): Promise<SendEmailResult> {
  const { contact, bomSummary, reasonForHandoff } = input;

  const rows: [string, string | undefined][] = [
    ["Name", contact.name],
    ["Company", contact.company],
    ["Email", contact.email],
    ["Phone", contact.phone],
    ["Project name", contact.projectName],
    ["Location", contact.location],
  ];

  const textLines: string[] = ["New AMBLUX lighting specialist review request", ""];
  const htmlRows: string[] = [];
  for (const [label, value] of rows) {
    if (!value) continue;
    textLines.push(`${label}: ${value}`);
    htmlRows.push(
      `<tr><td style="padding:4px 12px 4px 0;color:#6b6255;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:4px 0;font-size:14px;">${escapeHtml(value)}</td></tr>`,
    );
  }

  if (reasonForHandoff) {
    textLines.push("", "Reason for handoff:", reasonForHandoff);
  }
  if (contact.notes) {
    textLines.push("", "Notes from customer:", contact.notes);
  }
  if (bomSummary) {
    textLines.push("", "Current project BOM:", bomSummary);
  }

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;">
      <h2 style="color:#2b2620;margin:0 0 12px;">New AMBLUX lighting specialist review request</h2>
      <table style="border-collapse:collapse;margin-bottom:16px;">${htmlRows.join("")}</table>
      ${reasonForHandoff ? `<h3 style="margin:16px 0 4px;color:#2b2620;">Reason for handoff</h3><p style="white-space:pre-wrap;font-size:14px;">${nl2br(escapeHtml(reasonForHandoff))}</p>` : ""}
      ${contact.notes ? `<h3 style="margin:16px 0 4px;color:#2b2620;">Notes from customer</h3><p style="white-space:pre-wrap;font-size:14px;">${nl2br(escapeHtml(contact.notes))}</p>` : ""}
      ${bomSummary ? `<h3 style="margin:16px 0 4px;color:#2b2620;">Current project BOM</h3><pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12.5px;background:#f7f5f2;padding:12px;border-radius:6px;">${escapeHtml(bomSummary)}</pre>` : ""}
    </div>
  `.trim();

  const subject = contact.projectName
    ? `New AMBLUX lead: ${contact.projectName} (${contact.name})`
    : `New AMBLUX lead: ${contact.name}`;

  return sendEmail({
    to: leadNotificationEmail(),
    subject,
    html,
    text: textLines.join("\n"),
    // Lets the specialist just hit "reply" in their inbox to reach the
    // customer directly, rather than having to copy the address out of the
    // body first.
    replyTo: contact.email,
  });
}
