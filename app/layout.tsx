import type { Metadata } from "next";
import "./globals.css";
import { TestProjectProvider } from "./providers/TestProjectProvider";

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
        <TestProjectProvider>{children}</TestProjectProvider>
      </body>
    </html>
  );
}
