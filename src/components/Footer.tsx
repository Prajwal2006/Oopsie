import Link from "next/link";
import { Wordmark } from "./Mascot";

export function Footer() {
  return (
    <footer className="mt-auto px-4 pt-10 pb-[calc(1.5rem+var(--safe-bottom))] text-center text-sm text-muted">
      <Link href="/" className="inline-block rounded-lg" aria-label="Oopsie home">
        <Wordmark small />
      </Link>
      <p className="mt-1">Say sorry, cutely. Links expire after 30 days.</p>
    </footer>
  );
}
