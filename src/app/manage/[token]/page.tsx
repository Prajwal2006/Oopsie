import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getManageView } from "@/lib/apologies";
import { TOKEN_RE } from "@/lib/tokens";
import { Mascot } from "@/components/Mascot";
import { ManageClient } from "./ManageClient";

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = {
  title: "Manage your Oopsie",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function Manage({ params }: Props) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();
  const view = await getManageView(token);
  if (!view) notFound();
  return <ManageClient token={token} initial={view} />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3" role="status">
          <Mascot size={96} />
          <p className="font-bold text-muted">Checking on your Oopsie…</p>
        </div>
      }
    >
      <Manage params={params} />
    </Suspense>
  );
}
