"use client";

import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

type Props = {
    isOpen: boolean;
    accountName: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function DeleteAccountModal({ isOpen, accountName, onConfirm, onCancel }: Props) {
    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onCancel} />

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-7 h-7 text-red-600" />
                    </div>

                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                        Delete Account?
                    </h3>

                    <p className="text-sm text-neutral-500 mb-6">
                        Are you sure you want to delete <span className="font-semibold text-neutral-700">{accountName}</span>?
                        You will lose all posts and data associated with this account. This action cannot be undone.
                    </p>

                    <div className="flex gap-3 justify-center">
                        <Button variant="secondary" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={onConfirm}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Yes, Delete Account
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
