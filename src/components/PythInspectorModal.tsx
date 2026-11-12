"use client";
import { Dialog } from "./Dialog";
import type { PythPriceData } from "@/lib/pyth";
export function PythInspectorModal({
  isOpen,
  onClose,
  etfName,
  holdings,
  prices,
}: {
  isOpen: boolean;
  onClose: () => void;
  etfName: string;
  holdings: { symbol: string; name: string; weight: number }[];
  prices: Record<string, PythPriceData>;
}) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={etfName + " reference prices"}
    >
      <div className="space-y-4">
        {holdings.map((h) => {
          const p = prices[h.symbol];
          return (
            <div key={h.symbol}>
              <strong>{h.symbol}</strong>
              <p>
                {p?.formatted || "Unavailable"} · {p?.status || "unavailable"}
              </p>
              <p className="text-xs text-slate-400">
                Published {p?.publishTime || "—"} · Confidence{" "}
                {p?.formattedConfidence || "—"}
              </p>
              <p className="text-xs break-all">
                {p?.feedId || "No verified feed"}
              </p>
            </div>
          );
        })}
        <p className="text-xs text-slate-400">
          Oracle confidence is not a guaranteed execution spread or a
          statistical standard deviation.
        </p>
      </div>
    </Dialog>
  );
}
