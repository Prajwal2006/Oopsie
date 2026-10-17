import Image from "next/image";
import type { ReactNode } from "react";

export const DEVELOPER = {
  name: "Prajwal",
  linkedin: "https://www.linkedin.com/in/prajwal-nh/",
  portfolio: "https://prajwalnh.vercel.app/",
};

function ExternalLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className="btn-ghost min-h-[48px] flex-1 whitespace-nowrap"
    >
      {children}
    </a>
  );
}

export function DeveloperStory() {
  return (
    <section aria-labelledby="story" className="mt-12 w-full text-left">
      <h2 id="story" className="mb-3 text-center text-sm font-bold tracking-widest text-muted uppercase">
        The story behind it
      </h2>

      <div className="overflow-hidden rounded-3xl border-2 border-line bg-card">
        <div className="relative aspect-square w-full">
          <Image
            src="/prajwal-nh.jpg"
            alt="Prajwal, the developer of Oopsie Woopsie, smiling in sunglasses while standing in the sea at sunset"
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
            style={{ objectPosition: "50% 55%" }}
          />
        </div>

        <div className="space-y-3 p-5">
          <p className="text-sm font-bold tracking-wide text-muted uppercase">Hi, I&apos;m {DEVELOPER.name} 👋</p>
          <h3 className="text-2xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
            A creative problem needed a creative solution
          </h3>
          <p className="leading-relaxed">
            There was someone I wanted to apologize to. We weren&apos;t really talking, things had gotten complicated,
            and I honestly didn&apos;t know how to start. A quick text felt too small and too easy to ignore. A big
            speech felt like way too much pressure.
          </p>
          <p className="leading-relaxed">
            So I built Oopsie Woopsie: a way to say sorry that&apos;s sincere, a little silly, and never pushy. You
            say what you mean, they decide if they&apos;re ready to talk, and if they are, they pick a time that works
            for them. (Yes, the &ldquo;No&rdquo; button runs away, but there&apos;s always a kind way out.)
          </p>
          <p className="leading-relaxed">If it helps even one person make that first move, it was worth building.</p>

          <div className="flex gap-2 pt-1">
            <ExternalLink href={DEVELOPER.linkedin} label={`${DEVELOPER.name} on LinkedIn`}>
              <span aria-hidden>💼</span> LinkedIn
            </ExternalLink>
            <ExternalLink href={DEVELOPER.portfolio} label={`${DEVELOPER.name}'s portfolio website`}>
              <span aria-hidden>🌐</span> Portfolio
            </ExternalLink>
          </div>
        </div>
      </div>
    </section>
  );
}
