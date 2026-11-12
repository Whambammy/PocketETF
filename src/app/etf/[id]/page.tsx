import { notFound } from "next/navigation";
import { resolveETF } from "@/lib/etfResolver";
import ETFDetailClient from "./ETFDetailClient";
type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function query(input: Record<string, string | string[] | undefined>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
    else if (value !== undefined) sp.set(key, value);
  }
  return sp;
}
export async function generateMetadata({ params, searchParams }: Params) {
  const { id } = await params;
  const etf = resolveETF(id, query(await searchParams));
  return {
    title: etf?.name || "Basket not found",
    description: etf?.description || "Verified token baskets on Solana.",
  };
}
export default async function ETFPage({ params, searchParams }: Params) {
  const { id } = await params;
  const sp = query(await searchParams);
  const etf = resolveETF(id, sp);
  if (!etf) notFound();
  return <ETFDetailClient etf={etf} queryStr={sp.toString()} />;
}
