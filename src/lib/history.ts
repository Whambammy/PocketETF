export interface HistoryEntry {
  signature: string;
  account: string;
  basket: string;
  mode: string;
  status: "pending" | "confirmed" | "finalized" | "failed" | "rejected";
  createdAt: string;
}
const key = "pocketetf-history-v1";
export function readHistory(account: string): HistoryEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (v: HistoryEntry) =>
          v.account === account &&
          typeof v.signature === "string" &&
          /^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(v.signature) &&
          ["pending", "confirmed", "finalized", "failed", "rejected"].includes(
            v.status,
          ) &&
          typeof v.basket === "string" &&
          typeof v.mode === "string" &&
          Number.isFinite(Date.parse(v.createdAt)),
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}
export function saveHistory(entry: HistoryEntry) {
  try {
    const all = JSON.parse(localStorage.getItem(key) || "[]");
    const entries = Array.isArray(all) ? all : [];
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          entry,
          ...entries.filter(
            (v: HistoryEntry) => v.signature !== entry.signature,
          ),
        ].slice(0, 100),
      ),
    );
  } catch {
    /* Storage is optional, never block submission tracking. */
  }
  window.dispatchEvent(new Event("pocketetf-history"));
}
export function downloadCsv(rows: string[][], filename: string) {
  // Neutralize spreadsheet formulas in any exported user-controlled field.
  const csv = rows
    .map((row) =>
      row
        .map(
          (value) =>
            '"' +
            (/^[=+@\-\t\r]/.test(value) ? "'" : "") +
            value.replace(/"/g, '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
