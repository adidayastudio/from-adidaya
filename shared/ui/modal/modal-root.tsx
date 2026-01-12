"use client";

import * as Dialog from "@radix-ui/react-dialog";

interface ModalRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function ModalRoot({
  open,
  onOpenChange,
  children,
}: ModalRootProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={typeof document !== "undefined" ? document.body : undefined}>
        {/* Overlay */}
        <Dialog.Overlay
          className="
            fixed inset-0
            z-[1000]
            bg-black/40
            backdrop-blur-sm
          "
        />
        {children}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
