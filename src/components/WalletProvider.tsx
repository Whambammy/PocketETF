"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getWallets } from "@wallet-standard/app";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { Dialog } from "./Dialog";
type Connect = {
  connect: () => Promise<{ accounts: readonly WalletAccount[] }>;
};
type Sign = {
  supportedTransactionVersions: readonly (number | string)[];
  signTransaction: (
    ...inputs: {
      account: WalletAccount;
      chain: "solana:mainnet";
      transaction: Uint8Array;
    }[]
  ) => Promise<readonly { signedTransaction: Uint8Array }[]>;
};
type Events = {
  on: (
    event: "change",
    listener: (change: { accounts?: readonly WalletAccount[] }) => void,
  ) => () => void;
};
interface WalletState {
  wallets: Wallet[];
  wallet: Wallet | null;
  account: WalletAccount | null;
  versions: number[];
  connect: (wallet: Wallet) => Promise<void>;
  disconnect: () => Promise<void>;
  sign: (bytes: Uint8Array) => Promise<Uint8Array>;
  error: string | null;
  requestConnect: () => void;
}
const Context = createContext<WalletState | null>(null);
function feature<T>(wallet: Wallet, key: `${string}:${string}`): T | undefined {
  return wallet.features[key] as T | undefined;
}
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  useEffect(() => {
    if (account) setSelectionOpen(false);
  }, [account]);
  useEffect(() => {
    const api = getWallets();
    const update = () =>
      setWallets(
        api
          .get()
          .filter(
            (w) =>
              w.chains.includes("solana:mainnet") &&
              !!feature<Sign>(w, "solana:signTransaction"),
          ),
      );
    update();
    const a = api.on("register", update),
      b = api.on("unregister", update);
    return () => {
      a();
      b();
    };
  }, []);
  useEffect(() => {
    if (!wallet) return;
    return feature<Events>(wallet, "standard:events")?.on(
      "change",
      (change) => {
        if (change.accounts !== undefined)
          setAccount(
            change.accounts.find((a) => a.chains.includes("solana:mainnet")) ||
              null,
          );
      },
    );
  }, [wallet]);
  const connect = useCallback(async (selected: Wallet) => {
    setError(null);
    try {
      const connectFeature = feature<Connect>(selected, "standard:connect");
      if (!connectFeature) throw new Error("Wallet cannot connect.");
      const result = await connectFeature.connect();
      const selectedAccount = result.accounts.find(
        (a) =>
          a.chains.includes("solana:mainnet") &&
          a.features.includes("solana:signTransaction"),
      );
      if (!selectedAccount)
        throw new Error(
          "This wallet does not provide a Solana mainnet signing account.",
        );
      setWallet(selected);
      setAccount(selectedAccount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connection failed.");
    }
  }, []);
  const disconnect = useCallback(async () => {
    try {
      if (wallet)
        await feature<{ disconnect: () => Promise<void> }>(
          wallet,
          "standard:disconnect",
        )?.disconnect();
    } finally {
      setAccount(null);
      setWallet(null);
    }
  }, [wallet]);
  const sign = useCallback(
    async (bytes: Uint8Array) => {
      if (!wallet || !account) throw new Error("Connect a wallet first.");
      const signer = feature<Sign>(wallet, "solana:signTransaction");
      if (!signer) throw new Error("Wallet cannot sign this transaction.");
      const [result] = await signer.signTransaction({
        account,
        chain: "solana:mainnet",
        transaction: bytes,
      });
      if (!result) throw new Error("No signed transaction returned.");
      return result.signedTransaction;
    },
    [wallet, account],
  );
  const versions = wallet
    ? (
        feature<Sign>(wallet, "solana:signTransaction")
          ?.supportedTransactionVersions || []
      )
        .filter((v) => v === 0 || v === 1)
        .map(Number)
    : [];
  return (
    <Context.Provider
      value={{
        wallets,
        wallet,
        account,
        versions,
        connect,
        disconnect,
        sign,
        error,
        requestConnect: () => setSelectionOpen(true),
      }}
    >
      {children}
      <Dialog
        open={selectionOpen}
        onClose={() => setSelectionOpen(false)}
        title="Connect Wallet"
      >
        <div className="space-y-3">
          {wallets.length ? (
            wallets.map((item) => (
              <button
                key={item.name}
                type="button"
                className="block w-full p-3 rounded-xl bg-[#146EF5]/15 border border-[#146EF5]/30 text-left hover:bg-[#146EF5]/25"
                onClick={() => void connect(item)}
              >
                {item.name}
              </button>
            ))
          ) : (
            <p className="text-sm text-slate-300">
              Open this site in your wallet browser or install a supported
              wallet extension.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      </Dialog>
    </Context.Provider>
  );
}
export function useWallet() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing wallet provider");
  return value;
}
export function WalletControl() {
  const state = useWallet();
  const [open, setOpen] = useState(false);
  if (state.account)
    return (
      <div className="flex items-center gap-2 text-xs">
        <span title={state.account.address}>
          {state.account.address.slice(0, 4)}…{state.account.address.slice(-4)}
        </span>
        <button
          className="text-slate-400 underline"
          onClick={() => void state.disconnect()}
        >
          Disconnect
        </button>
      </div>
    );
  return (
    <div className="relative">
      <button
        className="btn-cobalt px-4 py-2 rounded-xl text-sm font-semibold"
        onClick={() => setOpen(!open)}
      >
        Connect wallet
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-72 rounded-xl bg-[#111A36] border border-slate-600 p-4 z-50 shadow-xl">
          <p className="text-xs text-slate-400 mb-3">
            Choose a Solana Wallet Standard wallet.
          </p>
          {state.wallets.length ? (
            state.wallets.map((w) => (
              <button
                key={w.name}
                className="block w-full text-left rounded p-3 hover:bg-white/10"
                onClick={async () => {
                  await state.connect(w);
                  setOpen(false);
                }}
              >
                {w.name}
              </button>
            ))
          ) : (
            <p className="text-sm">
              Open this site in your wallet browser or install a supported
              wallet extension.
            </p>
          )}
          {state.error && (
            <p role="alert" className="text-red-300 text-xs mt-3">
              {state.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
