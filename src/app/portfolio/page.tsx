import { PortfolioView } from "@/components/PortfolioDrawer";
export const metadata = { title: "Portfolio & history" };
export default function PortfolioPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-4xl font-bold">Portfolio & history</h1>
      <PortfolioView />
    </div>
  );
}
