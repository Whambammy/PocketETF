import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Creator Studio",
  description:
    "Choose exact verified token mints, set allocation weights and share a self-custodied basket.",
};
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
