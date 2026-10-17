"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ModalRoot } from "./modal-root";
import { ModalConfirmProps } from "./modal.types";

export function ModalConfirm({
  open,
  onOpenChange,
  title,
  description,
  status = "neutral",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
}: ModalConfirmProps) {
  return (
    <ModalRoot open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        className="
          fixed left-1/2 top-1/2
          z-[1100]
          w-full max-w-sm
          -translate-x-1/2 -translate-y-1/2
          rounded-xl
          bg-white
          text-text-primary
          shadow-2xl
        "
      >
        <div className="space-y-4 p-5">
          <div>
            <Dialog.Title
              className={`text-base font-semibold ${status === "danger" ? "text-red-600" : ""
                }`}
            >
              {title}
            </Dialog.Title>
            {description && (
              <Dialog.Description className="mt-1 text-sm text-text-muted">
                {description}
              </Dialog.Description>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {cancelLabel && (
              <button
                className="rounded-md px-4 py-2 text-sm text-text-muted hover:bg-bg-200"
                onClick={() => onOpenChange(false)}
              >
                {cancelLabel}
              </button>
            )}

            <button
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${status === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-neutral-900 hover:bg-neutral-800"
                }`}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </Dialog.Content>
    </ModalRoot >
  );
}
