"use client";
import { useState, useEffect, useRef } from "react";
import type { ETFDefinition } from "@/lib/constants";
import type { TradePreview } from "@/lib/jupiter";
import { useWallet, WalletControl } from "./WalletProvider";
import { saveHistory, type HistoryEntry } from "@/lib/history";
const from64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const to64 = (b: Uint8Array) =>
  btoa(Array.from(b, (c) => String.fromCharCode(c)).join(""));
export function TradePanel({
  etf,
  query = "",
}: {
  etf: ETFDefinition;
  query?: string;
}) {
  const wallet = useWallet();
  const [mode, setMode] = useState<"buy" | "sell" | "rebalance">("buy");
  const [amount, setAmount] = useState("10");
  const [slippage, setSlippage] = useState(50);
  const [preview, setPreview] = useState<TradePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const [now, setNow] = useState(Date.now());
  const controller = useRef<AbortController | null>(null);
  const version = wallet.versions.includes(1) ? 1 : 0;
  const canSign = wallet.versions.includes(version);
  const key = JSON.stringify([
    wallet.account?.address,
    etf.id,
    query,
    mode,
    amount,
    slippage,
    version,
  ]);
  useEffect(() => {
    controller.current?.abort();
    setPreview(null);
  }, [key]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => () => controller.current?.abort(), []);
  const prepare = async () => {
    if (!wallet.account) return;
    setBusy(true);
    setError("");
    setPreview(null);
    setStatus("Checking balances, routes and simulation…");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const res = await fetch("/api/trades/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: etf.id,
          query,
          account: wallet.account.address,
          mode,
          amount,
          version,
          slippageBps: slippage,
        }),
        signal: abort.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Trade preview failed.");
      if (!abort.signal.aborted) {
        setPreview(data.preview);
        setStatus("Review amounts and fees below.");
      }
    } catch (e) {
      if (!abort.signal.aborted) {
        setError(e instanceof Error ? e.message : "Preview failed.");
        setStatus("");
      }
    } finally {
      if (controller.current === abort) setBusy(false);
    }
  };
  const execute = async () => {
    if (
      !preview ||
      !wallet.account ||
      preview.account !== wallet.account.address ||
      preview.expiresAt < Date.now() + 3000
    )
      return;
    setBusy(true);
    setError("");
    let entry: HistoryEntry | undefined;
    try {
      setStatus("Approve the reviewed transaction in your wallet.");
      const signed = await wallet.sign(from64(preview.transaction));
      const { getTransactionDecoder, getBase58Decoder, address } =
        await import("@solana/kit");
      const decoded = getTransactionDecoder().decode(signed);
      const original = getTransactionDecoder().decode(
        from64(preview.transaction),
      );
      if (
        decoded.messageBytes.length !== original.messageBytes.length ||
        decoded.messageBytes.some(
          (byte, i) => byte !== original.messageBytes[i],
        )
      )
        throw new Error(
          "The wallet changed the reviewed transaction. Refresh the preview.",
        );
      const walletSignature = decoded.signatures[address(preview.account)];
      if (!walletSignature)
        throw new Error("Wallet did not provide the expected signature.");
      const candidate = getBase58Decoder().decode(walletSignature);
      setSignature(candidate);
      entry = {
        signature: candidate,
        account: wallet.account.address,
        basket: etf.name,
        mode,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      saveHistory(entry);
      setStatus("Submitting the signed transaction…");
      const response = await fetch("/api/trades/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction: to64(signed),
          account: preview.account,
          expectedMessageHash: preview.messageHash,
          expiresAt: preview.expiresAt,
          lastValidBlockHeight: preview.lastValidBlockHeight,
          mints: etf.targetAssets.map((asset) => asset.mint),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500)
          saveHistory({ ...entry, status: "rejected" });
        throw new Error(data.message || "Submission could not be verified.");
      }
      if (data.signature !== candidate)
        throw new Error(
          "Unexpected submission signature. Check the original signature in the explorer.",
        );
      setSignature(data.signature);
      setPreview(null);
      setStatus("Submitted. Waiting for chain confirmation…");
      for (let i = 0; i < 60; i++) {
        const res = await fetch(
          "/api/trades/status?signature=" + encodeURIComponent(data.signature),
        );
        if (res.ok) {
          const result = await res.json();
          if (result.status === "failed") {
            saveHistory({ ...entry, status: "failed" });
            throw new Error(
              "The transaction failed on chain. Network fees may still apply.",
            );
          }
          if (result.status === "confirmed" || result.status === "finalized") {
            saveHistory({ ...entry, status: result.status });
            setStatus(
              result.status === "finalized"
                ? "Transaction finalized."
                : "Transaction confirmed.",
            );
            window.dispatchEvent(new Event("pocketetf-balance"));
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      setStatus(
        "Still pending. Check the explorer or history before trying another trade.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Transaction could not be completed.",
      );
      setStatus(
        entry
          ? "Check the transaction in the explorer before retrying."
          : "No confirmed purchase has been recorded.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="fintech-card rounded-2xl p-6 space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Trade basket</h2>
        <span className="text-xs text-slate-400">Solana mainnet</span>
      </div>

      <div className="flex gap-2" role="group" aria-label="Trade mode">
        {(["buy", "sell", "rebalance"] as const).map((m) => (
          <button
            key={m}
            disabled={busy}
            className={
              "px-4 py-2 rounded-lg capitalize " +
              (mode === m ? "bg-blue-600" : "bg-white/5")
            }
            onClick={() => {
              setMode(m);
              setAmount(m === "sell" ? "100" : "10");
            }}
          >
            {m}
          </button>
        ))}
      </div>
      {mode !== "rebalance" && (
        <label className="block text-sm">
          {mode === "buy"
            ? "Spend USDC"
            : "Sell percentage of each basket holding"}
          <input
            className="mt-2 block w-full rounded-lg bg-black/30 border border-slate-600 p-3"
            inputMode="decimal"
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      )}
      {mode === "rebalance" && (
        <p className="text-sm text-slate-300">
          Sell overweight holdings and buy underweight holdings using only
          guaranteed sale proceeds. Existing USDC is preserved. Surplus stays in
          USDC; execution costs can leave small differences from target.
        </p>
      )}
      <label className="block text-sm">
        Slippage limit
        <select
          className="block mt-2 bg-[#111A36] p-2 border border-slate-600 rounded-lg"
          value={slippage}
          disabled={busy}
          onChange={(e) => setSlippage(Number(e.target.value))}
        >
          <option value={25}>0.25%</option>
          <option value={50}>0.50%</option>
          <option value={100}>1.00%</option>
        </select>
      </label>
      {wallet.account ? (
        <>
          <p className="text-xs text-slate-400">
            {canSign
              ? "Wallet supports v" + version + " signing."
              : "This wallet does not advertise a supported transaction format."}{" "}
            Baskets must pass actual size, account and compute checks.
          </p>
          <button
            className="btn-cobalt px-5 py-3 rounded-xl font-semibold disabled:opacity-40"
            disabled={busy || !canSign}
            onClick={() => void prepare()}
          >
            {busy ? "Working…" : "Preview " + mode}
          </button>
        </>
      ) : (
        <WalletControl />
      )}
      {preview && (
        <div className="rounded-xl bg-black/25 border border-emerald-500/30 p-4 space-y-3">
          <h3 className="font-semibold">Review before signing</h3>
          {preview.legs.map((l, i) => (
            <div key={i} className="text-sm border-b border-white/10 pb-2">
              <span className="capitalize">{l.direction}</span> {l.ticker}:{" "}
              {l.input} {l.direction === "buy" ? "USDC" : "display units"} →
              approximately {l.expectedOutput} {l.outputSymbol}
              <br />
              <span className="text-slate-400">
                Minimum {l.minimumOutput} · price impact{" "}
                {l.priceImpactPercent.toFixed(3)}%
              </span>
              <details className="text-xs text-slate-400 mt-1">
                <summary>Exact on-chain amounts</summary>
                <p>
                  Input: {l.inputAtomic} base units. Minimum output:{" "}
                  {l.minimumOutputAtomic} base units.
                </p>
              </details>
            </div>
          ))}
          <dl className="text-xs space-y-1 text-slate-300">
            <div>
              Network fee: {(preview.networkFeeLamports / 1e9).toFixed(7)} SOL
            </div>
            <div>
              New account rent: {(preview.rentLamports / 1e9).toFixed(7)} SOL
            </div>
            <div>Protocol fee: 0% · DEX costs reflected in the quote</div>
            <div>
              v{preview.version} · {preview.byteLength} bytes ·{" "}
              {preview.computeUnits.toLocaleString()} compute units
            </div>
            <div>
              Expires in{" "}
              {Math.max(0, Math.floor((preview.expiresAt - now) / 1000))}{" "}
              seconds
            </div>
          </dl>
          {preview.mode === "rebalance" && (
            <div className="text-xs">
              {preview.allocation.map((a) => (
                <div key={a.ticker}>
                  {a.ticker}: {a.current.toFixed(1)}% → target {a.target}%
                </div>
              ))}
            </div>
          )}
          <button
            className="bg-emerald-600 px-5 py-3 rounded-xl font-semibold disabled:opacity-40"
            disabled={busy || preview.expiresAt < now + 3000}
            onClick={() => void execute()}
          >
            {preview.expiresAt < now + 3000
              ? "Preview expired — refresh above"
              : "Approve reviewed trade"}
          </button>
        </div>
      )}
      <p role="status" aria-live="polite" className="text-sm text-slate-300">
        {status}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-red-200 text-sm"
        >
          {error}
        </p>
      )}
      {signature && (
        <a
          className="text-emerald-400 text-sm underline break-all"
          target="_blank"
          rel="noopener noreferrer"
          href={"https://explorer.solana.com/tx/" + signature}
        >
          View transaction in Solana Explorer
        </a>
      )}
      <p className="text-xs text-slate-400">
        Swaps are atomic within one transaction. Failed submitted transactions
        can still cost network fees. SOL holdings here mean wrapped SOL; native
        SOL remains available for fees.
      </p>
    </section>
  );
}
