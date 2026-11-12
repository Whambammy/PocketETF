"use client";
import { useEffect, useState, useCallback } from "react";
import { useWallet, WalletControl } from "./WalletProvider";
import {
  readHistory,
  saveHistory,
  downloadCsv,
  type HistoryEntry,
} from "@/lib/history";
import type { PythPriceData } from "@/lib/pyth";
interface Balance {
  account: string;
  sol: number;
  usdc: number;
  holdings: {
    ticker: string;
    mint: string;
    quantity: number;
    amountAtomic: string;
    spendableAtomic: string;
  }[];
  prices: Record<string, PythPriceData>;
  valuation: { value: number | null; knownValue: number; missing: string[] };
  observedAt: string;
}
export function PortfolioView() {
  const wallet = useWallet();
  const account = wallet.account?.address;
  const [snapshot, setData] = useState<Balance | null>(null);
  const data = snapshot?.account === account ? snapshot : null;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!account) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        "/api/wallet/balance?account=" + encodeURIComponent(account),
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Unable to read balances.");
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load balances.");
    } finally {
      setBusy(false);
    }
  }, [account]);
  useEffect(() => {
    setData(null);
    setHistory(account ? readHistory(account) : []);
    void refresh();
    const update = () => setHistory(account ? readHistory(account) : []);
    window.addEventListener("pocketetf-balance", refresh);
    window.addEventListener("pocketetf-history", update);
    return () => {
      window.removeEventListener("pocketetf-balance", refresh);
      window.removeEventListener("pocketetf-history", update);
    };
  }, [account, refresh]);
  const reconcile = async () => {
    if (!account) return;
    setBusy(true);
    try {
      for (const h of readHistory(account).filter(
        (h) => h.status === "pending" || h.status === "confirmed",
      )) {
        const r = await fetch(
          "/api/trades/status?signature=" + encodeURIComponent(h.signature),
        );
        if (!r.ok) continue;
        const d = await r.json();
        if (["confirmed", "finalized", "failed"].includes(d.status))
          saveHistory({ ...h, status: d.status });
      }
      setHistory(readHistory(account));
    } finally {
      setBusy(false);
    }
  };
  if (!account)
    return (
      <div className="fintech-card p-6 rounded-xl space-y-4">
        <p>
          Connect a wallet to read holdings and this browser’s transaction
          history.
        </p>
        <WalletControl />
      </div>
    );
  return (
    <div className="space-y-8">
      <div className="flex gap-3 flex-wrap">
        <button
          disabled={busy}
          className="btn-cobalt rounded-xl px-4 py-2 disabled:opacity-40"
          onClick={() => void refresh()}
        >
          {busy ? "Loading…" : "Refresh balances"}
        </button>
        <button
          disabled={!data}
          className="border border-slate-600 rounded-xl px-4 py-2"
          onClick={() =>
            data &&
            downloadCsv(
              [
                [
                  "Ticker",
                  "Mint",
                  "Quantity",
                  "Raw amount",
                  "Spendable raw amount",
                  "Reference USD price",
                ],
                ...data.holdings.map((h) => [
                  h.ticker,
                  h.mint,
                  String(h.quantity),
                  h.amountAtomic,
                  h.spendableAtomic,
                  String(data.prices[h.ticker]?.price ?? "Unavailable"),
                ]),
              ],
              "pocketetf-holdings.csv",
            )
          }
        >
          Export holdings
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {data && (
        <>
          <section className="grid sm:grid-cols-3 gap-4">
            {[
              [
                "Reference portfolio value",
                data.valuation.value === null
                  ? "Incomplete valuation"
                  : "$" + data.valuation.value.toFixed(2),
              ],
              ["Native SOL", data.sol.toFixed(5)],
              ["USDC", data.usdc.toFixed(2)],
            ].map(([label, value]) => (
              <div className="fintech-card p-5 rounded-xl" key={label}>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="text-2xl font-bold mt-2">{value}</p>
              </div>
            ))}
          </section>
          <p className="text-xs text-slate-400">
            Observed {new Date(data.observedAt).toLocaleString()}. Reference
            values use actual scaled token quantities, not basket weights.
            Missing or stale prices:{" "}
            {data.valuation.missing.join(", ") || "none at observation"}.
            Refresh before relying on values.
          </p>
          <div className="overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-400">
                <tr>
                  <th className="p-3">Asset</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Reference value</th>
                  <th className="p-3">Price status</th>
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h) => {
                  const p = data.prices[h.ticker];
                  return (
                    <tr key={h.mint} className="border-t border-slate-700">
                      <td className="p-3">
                        <a
                          className="text-blue-300"
                          href={"https://explorer.solana.com/address/" + h.mint}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {h.ticker}
                        </a>
                      </td>
                      <td className="p-3">
                        {h.quantity.toLocaleString(undefined, {
                          maximumFractionDigits: 8,
                        })}
                      </td>
                      <td className="p-3">
                        {p?.status === "live" && p.price !== null
                          ? "$" + (h.quantity * p.price).toFixed(2)
                          : "Unavailable"}
                      </td>
                      <td className="p-3">
                        {p?.status || "unavailable"}
                        {h.spendableAtomic !== h.amountAtomic &&
                          " · partly held outside a spendable associated account"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!data.holdings.length && (
            <p>
              No registered token holdings were found. Unregistered assets are
              not included in this portfolio.
            </p>
          )}
        </>
      )}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Transaction history</h2>
        <p className="text-xs text-slate-400">
          Recorded by this app in this browser, scoped to your wallet. This is
          not a complete blockchain history.
        </p>
        <div className="flex gap-3">
          <button
            disabled={busy}
            className="border border-slate-600 rounded-lg px-3 py-2 text-sm"
            onClick={() => void reconcile()}
          >
            Check pending transactions
          </button>
          <button
            className="border border-slate-600 rounded-lg px-3 py-2 text-sm"
            onClick={() =>
              downloadCsv(
                [
                  ["Time", "Basket", "Mode", "Status", "Signature"],
                  ...history.map((h) => [
                    h.createdAt,
                    h.basket,
                    h.mode,
                    h.status,
                    h.signature,
                  ]),
                ],
                "pocketetf-history.csv",
              )
            }
          >
            Export history
          </button>
        </div>
        {history.map((h) => (
          <article
            key={h.signature}
            className="fintech-card p-4 rounded-xl text-sm space-y-2"
          >
            <div>
              {h.basket} · {h.mode} · <strong>{h.status}</strong>
            </div>
            <p className="text-xs text-slate-400">
              {new Date(h.createdAt).toLocaleString()}
            </p>
            <a
              className="text-blue-300 break-all text-xs"
              href={"https://explorer.solana.com/tx/" + h.signature}
              target="_blank"
              rel="noopener noreferrer"
            >
              {h.signature}
            </a>
          </article>
        ))}
        {!history.length && (
          <p className="text-sm text-slate-400">
            No trades recorded in this browser.
          </p>
        )}
      </section>
    </div>
  );
}
