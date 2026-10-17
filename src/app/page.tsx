import Link from "next/link";
import { Footer } from "@/components/Footer";
import { DeveloperStory } from "@/components/DeveloperStory";
import { Mascot, Wordmark } from "@/components/Mascot";

const steps = [
  { emoji: "✍️", title: "Write it", body: "Pick a vibe and say what you mean. We'll help you start." },
  { emoji: "💌", title: "Send it", body: "Get a cute private link to text them. No sign-up, no app." },
  { emoji: "📅", title: "Get a date to talk", body: "They tap “yes” and pick a time that works from your week." },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,#ffe0d3_0%,#fff7f1_55%)]">
      <header className="px-4 pt-[calc(1rem+var(--safe-top))]">
        <Wordmark />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pt-8 text-center">
        <Mascot size={156} />
        <h1 className="mt-4 text-4xl font-semibold tracking-tight" style={{ fontFamily: "var(--nf-display)" }}>
          Oopsie Woopsie
        </h1>
        <p className="mt-2 text-xl text-muted">Say sorry, cutely.</p>

        <Link href="/create" className="btn-primary mt-8 w-full max-w-xs text-lg">
          Make an Oopsie Woopsie <span aria-hidden>💌</span>
        </Link>

        <section aria-labelledby="how" className="mt-12 w-full text-left">
          <h2 id="how" className="mb-3 text-center text-sm font-bold tracking-widest text-muted uppercase">
            How it works
          </h2>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-3xl border-2 border-line bg-card p-4">
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffe9e5] text-2xl"
                >
                  {s.emoji}
                </span>
                <div>
                  <p className="font-bold">
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </p>
                  <p className="text-sm text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <DeveloperStory />
      </main>

      <Footer />
    </div>
  );
}
