"use client";

import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Renders children into <body>. Fixed overlays must not live inside their trigger's DOM: an ancestor with
 * transform, filter or backdrop-filter becomes their containing block (so `inset-0` fills that ancestor,
 * not the screen), and any ancestor stacking context caps their z-index. Only render this on the client,
 * behind state set by user interaction.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour while mounted: locks page scroll, closes on Escape, keeps Tab inside the dialog, and
 * returns focus to whatever had it before. Focus starts on `[data-autofocus]`, else the first focusable.
 */
export function useModal(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
    (root.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [ref]);
}

/**
 * Bottom sheet. `tall` gives an 88dvh panel whose children supply their own header; otherwise the sheet
 * renders `title` with a close button.
 */
export function Sheet({ title, onClose, children, tall }: { title: string; onClose: () => void; children: React.ReactNode; tall?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useModal(panel, onClose);
  return (
    <Portal>
      <div className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-navy/60" onClick={onClose}>
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "animate-sheet-up flex w-full max-w-[480px] flex-col overscroll-contain rounded-t-3xl bg-surface",
            // Clear the home indicator without losing the sheet's own padding.
            tall ? "safe-bottom h-[88dvh]" : "max-h-[88dvh] overflow-y-auto px-5 pb-[calc(1.25rem+var(--sab))] pt-5",
          )}
        >
          {tall ? (
            children
          ) : (
            <>
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-2xl font-semibold tracking-tight">{title}</p>
                <CloseButton onClick={onClose} />
              </div>
              {children}
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}

export function CloseButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="Close" className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-ink hover:bg-gray-200", className)}>
      <X size={18} />
    </button>
  );
}
