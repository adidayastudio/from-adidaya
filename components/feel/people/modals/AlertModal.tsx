"use client";

import { ModalRoot } from "@/shared/ui/modal";
import * as Dialog from "@radix-ui/react-dialog";

type AlertModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
};

export default function AlertModal({
    isOpen,
    onClose,
    title = "Validation Error",
    message
}: AlertModalProps) {
    if (!message) return null;

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

                <div className="p-4 pt-2">
                    <button
                        onClick={onClose}
                        className="w-full h-[44px] flex items-center justify-center text-[15px] font-semibold text-white bg-[#007AFF] hover:bg-[#007AFF]/90 active:bg-[#007AFF]/80 rounded-full transition-colors focus:outline-none shadow-lg shadow-blue-500/20"
                    >
                        OK
                    </button>
                </div>
            </div>
        </ModalRoot>
    );
}

