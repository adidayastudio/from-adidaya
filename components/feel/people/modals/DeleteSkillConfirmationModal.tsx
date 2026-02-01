"use client";

import { ModalRoot } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/primitives/button/button";
import { Trash2, AlertTriangle } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

type DeleteSkillConfirmationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    skillName: string;
};

export default function DeleteSkillConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    skillName
}: DeleteSkillConfirmationModalProps) {
    return (
        <ModalRoot open={isOpen} onOpenChange={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8" />
                    </div>

                    <Dialog.Title asChild>
                        <h2 className="text-xl font-bold text-neutral-900 leading-tight">
                            Remove Skill?
                        </h2>
                    </Dialog.Title>

                    <p className="text-neutral-500 text-sm px-4">
                        Are you sure you want to remove <span className="font-bold text-neutral-900">"{skillName}"</span>? This action cannot be undone.
                    </p>
                </div>

                <div className="px-8 pb-8 flex flex-col gap-3">
                    <Button
                        onClick={onConfirm}
                        className="w-full rounded-2xl h-12 font-bold bg-red-600 hover:bg-red-700 text-white border-none shadow-md transition-all active:scale-95"
                    >
                        Yes, Remove Skill
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="w-full rounded-2xl h-12 font-bold text-neutral-500 border-neutral-100 hover:bg-neutral-50 transition-all border-none"
                    >
                        No, Keep It
                    </Button>
                </div>
            </div>
        </ModalRoot>
    );
}
