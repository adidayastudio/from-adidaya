"use client";

import { ReactNode, useEffect } from "react";
import clsx from "clsx";

export type DrawerSize = "sm" | "md" | "lg";

export function Drawer({
  open,
  onClose,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  size?: DrawerSize;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* PANEL */}
      <div
        className={clsx(
          "absolute right-0 top-0 h-full bg-white shadow-xl transition-transform max-w-full",
          size === "sm" && "w-[360px]",
          size === "md" && "w-[480px]",
          size === "lg" && "w-[640px]"
        )}
      >
        {children}
      </div>
    </div>
  );
}
