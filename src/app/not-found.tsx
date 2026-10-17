import Link from "next/link";
import { Mascot } from "@/components/Mascot";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Mascot size={120} mood="calm" />
      <h1 className="mt-4 text-3xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
        This note has floated away
      </h1>
      <p className="mt-2 max-w-sm text-muted">
        The link may have expired (Oopsie Woopsies last 30 days) or been removed by its sender.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Visit Oopsie Woopsie
      </Link>
    </main>
  );
}
