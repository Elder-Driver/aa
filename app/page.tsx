import type { Metadata } from "next";
import { AAApp } from "./aa-app";

export const metadata: Metadata = {
  title: "分账搭子 SplitPack",
  description: "创建旅行账本，邀请朋友一起记录支出，并自动算出最少转账方案。",
};

export default function Home() {
  return <AAApp />;
}
