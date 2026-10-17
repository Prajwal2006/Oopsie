import type { Metadata } from "next";
import { Wizard } from "./Wizard";

export const metadata: Metadata = {
  title: "Make an Oopsie",
  description: "Write a cute apology, add your availability, and get a link to send.",
};

export default function CreatePage() {
  return <Wizard />;
}
