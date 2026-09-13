import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { LocaleProvider } from "./providers/LocaleProvider";
import { TestProjectProvider } from "./providers/TestProjectProvider";
import { ChatProvider } from "./providers/ChatProvider";
import { ChatWidget } from "./components/chat/ChatWidget";

// The original ChatGPT-built site used "Avenir Next, Helvetica Neue, Arial,
// sans-serif" (recovered from the compiled CSS). Avenir Next isn't a
// freely-hostable web font, so we keep the same stack — it renders as
// Avenir Next for anyone who has it installed and falls back gracefully
// for everyone else, matching the original's intent without a licensing
// question we can't resolve here.
const brandFontStack =
  '"Avenir Next", "Helvetica Neue", Arial, ui-sans-serif, system-ui, sans-serif';

export const metadata: Metadata = {
  title: "AMBLUX — Kitchen, Furniture & Closet Lighting Solutions",
  description:
    "AMBLUX designs and supplies integrated LED lighting solutions for the kitchen, furniture, and closet industries, built for hardware distributors and dealers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={{ ["--font-brand" as string]: brandFontStack }}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider>
          <TestProjectProvider>
            <ChatProvider>
              {children}
              <ChatWidget />
            </ChatProvider>
          </TestProjectProvider>
        </LocaleProvider>
      </body>
      {/* Google Analytics (GA4). The tracking ID lives in an environment
          variable (NEXT_PUBLIC_GA_ID) rather than hardcoded here, so it's
          set once in Vercel's project settings, never committed to the
          repo, and the site still builds/runs fine with analytics simply
          turned off (this component renders nothing) if that variable is
          ever unset — e.g. a preview/local build with no GA ID configured. */}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
