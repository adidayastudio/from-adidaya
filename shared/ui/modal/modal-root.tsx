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
            data-[state=open]:animate-in
            data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0
            data-[state=open]:fade-in-0
          "
        />

        {/* Centered Container */}
        <Dialog.Content
          className="
            fixed left-[50%] top-[50%] z-[1001]
            translate-x-[-50%] translate-y-[-50%]
          "
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
