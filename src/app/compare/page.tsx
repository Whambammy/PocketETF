import { ComparisonMatrix } from "@/components/ComparisonMatrix";
import { FAQSection } from "@/components/FAQSection";
export const metadata = {
  title: "How it works",
  description:
    "Understand basket ownership, quotes, fees and atomic execution.",
};
export default function ComparePage() {
  return (
    <>
      <ComparisonMatrix />
      <div className="max-w-4xl mx-auto px-4">
        <FAQSection />
      </div>
    </>
  );
}
