"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";

export function InviteButtons({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const link = () => `${window.location.origin}/join/${code}`;
  return (
    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
      <a
        className="btn btn-accent min-w-0"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          const text = `Join my Riadha fantasy league "${name}" 🇰🇪⚽ ${link()}`;
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        }}
      >
        <MessageCircle size={17} /> WhatsApp invite
      </a>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(link());
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <Copy size={16} /> {copied ? "Copied" : code}
      </button>
    </div>
  );
}
