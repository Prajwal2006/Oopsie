import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { getPublicApology as load } from "@/lib/apologies";
import { SLUG_RE } from "@/lib/tokens";
import { Mascot } from "@/components/Mascot";
import { RecipientExperience } from "./RecipientExperience";

type Props = { params: Promise<{ slug: string }> };

// Dedupe the lookup between generateMetadata and the page render.
const getPublicApology = cache(load);

const description = "Someone made you a little apology. Tap to open it 💌";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const apology = SLUG_RE.test(slug) ? await getPublicApology(slug) : null;
  // Never reveal the message itself in link previews.
  const title = apology ? `Oopsie Woopsie! ${apology.senderName} has something to say` : "Oopsie Woopsie | Say sorry, cutely";
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, siteName: "Oopsie Woopsie", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

async function Apology({ params }: Props) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();
  const apology = await getPublicApology(slug);
  if (!apology) notFound();
  return <RecipientExperience apology={apology} />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#fff7f1]" role="status">
          <Mascot size={96} />
          <p className="font-bold text-muted">Unfolding your note…</p>
        </div>
      }
    >
      <Apology params={params} />
    </Suspense>
  );
}
