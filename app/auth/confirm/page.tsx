import { Suspense } from "react";
import { SiteHeader } from "@/app/components/SiteHeader";
import { ConfirmClient } from "./ConfirmClient";

// Landing point for every Supabase auth email link (password reset today;
// signup confirmation or magic links later would land here too). See
// ConfirmClient.tsx for why this runs client-side rather than as a server
// Route Handler.
export default function AuthConfirmPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-sm text-muted">
        <Suspense fallback={<p>Signing you in…</p>}>
          <ConfirmClient />
        </Suspense>
      </div>
    </div>
  );
}
