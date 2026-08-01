import type { Metadata } from "next";
import { AAApp } from "../../aa-app";

export const metadata: Metadata = {
  title: "AA",
  description: "Split trip expenses with friends and settle up with fewer transfers.",
};

export default function BookPage() {
  return <AAApp />;
}
