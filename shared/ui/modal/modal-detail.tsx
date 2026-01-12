"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ModalRoot } from "./modal-root";
import { ModalDetailProps } from "./modal.types";

export function ModalDetail({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
}: ModalDetailProps) {
  return (
    <ModalRoot open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        className="
          fixed left-1/2 top-1/2
          z-[1100]
          w-full max-w-3xl
          -translate-x-1/2 -translate-y-1/2
          rounded-xl
          bg-white
          text-text-primary
          shadow-2xl
        "
      >
        <div className="flex max-h-[80vh] flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              {subtitle && (
                <p className="mt-1 text-sm text-text-muted">
                  {subtitle}
                </p>
              )}
            </div>
            <Dialog.Close className="text-text-muted hover:text-text-primary">
              ✕
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t px-5 py-3 flex justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </Dialog.Content>
    </ModalRoot>
  );
}
