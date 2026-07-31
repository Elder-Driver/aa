import type { Metadata } from "next";
import { AAApp } from "./aa-app";

export const metadata: Metadata = {
  title: "一起AA｜旅行分账，轻松算清",
  description: "创建旅行账本，邀请朋友一起记账，只和实际参与的人分摊。",
};

export default function Home() {
  return <AAApp />;
}
