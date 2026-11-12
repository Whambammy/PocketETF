"use client";
import { QRCodeSVG } from "qrcode.react";
import { Dialog } from "./Dialog";
export function MobileQRModal({
  isOpen,
  onClose,
  etfName,
  url,
}: {
  isOpen: boolean;
  onClose: () => void;
  etfId: string;
  etfName: string;
  url: string;
}) {
  const deepLink = "https://phantom.app/ul/browse/" + encodeURIComponent(url);
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={"Open " + etfName + " on mobile"}
    >
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-white w-fit mx-auto">
          <QRCodeSVG value={url || "https://pocketetf.vercel.app"} size={220} />
        </div>
        <p className="text-sm text-slate-300">
          Scan this link with your wallet browser. Check the app domain and
          review the basket before signing.
        </p>
        <a
          className="block text-center btn-cobalt p-3 rounded-xl"
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Phantom browser
        </a>
        <p className="text-xs break-all text-slate-400">{url}</p>
      </div>
    </Dialog>
  );
}
