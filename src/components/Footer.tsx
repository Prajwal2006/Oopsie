import Link from "next/link";
import { Wordmark } from "./Mascot";

export function BuiltBy({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-xs ${className}`}>
      Made with <span aria-hidden>💌</span>
      <span className="sr-only">love</span> by{" "}
      <a
        href="https://prajwalnh.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold underline underline-offset-4"
      >
        Prajwal
      </a>
    </p>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto px-4 pt-10 pb-[calc(1.5rem+var(--safe-bottom))] text-center text-sm text-muted">
      <Link href="/" className="inline-block rounded-lg" aria-label="Oopsie Woopsie home">
        <Wordmark small />
      </Link>
      <p className="mt-1">Say sorry, cutely. Links expire after 30 days.</p>
      <BuiltBy className="mt-1" />
    </footer>
  );
}
