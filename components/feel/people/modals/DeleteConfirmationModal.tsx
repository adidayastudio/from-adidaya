"use client";

"use client";

import { ModalRoot } from "@/shared/ui/modal";
import * as Dialog from "@radix-ui/react-dialog";

type DeleteConfirmationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
};

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Delete Confirmation",
    message = "Are you sure you want to delete this item? This action cannot be undone."
}: DeleteConfirmationModalProps) {
    return (
        <ModalRoot open={isOpen} onOpenChange={onClose}>
            <div className="bg-white/85 backdrop-blur-2xl rounded-[16px] shadow-2xl w-[280px] max-w-[80vw] overflow-hidden transform scale-100 transition-all select-none border border-white/40 ring-1 ring-black/5">
                <div className="p-5 pt-6 text-center space-y-1.5">
                    <Dialog.Title className="text-[17px] font-bold text-black leading-snug m-0 tracking-tight">
                        {title}
                    </Dialog.Title>
                    <p className="text-[13px] text-neutral-500 leading-relaxed px-2 font-medium">
                        {message}
                    </p>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3">
                    <button
                        onClick={onClose}
                        className="w-full h-[44px] flex items-center justify-center text-[15px] font-semibold text-black bg-[#E5E5EA]/80 hover:bg-[#D1D1D6] active:bg-[#C7C7CC] rounded-full transition-colors focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="w-full h-[44px] flex items-center justify-center text-[15px] font-semibold text-white bg-[#FF3B30] hover:bg-[#FF3B30]/90 active:bg-[#FF3B30]/80 rounded-full transition-colors focus:outline-none shadow-lg shadow-red-500/20"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </ModalRoot>
    );
}
