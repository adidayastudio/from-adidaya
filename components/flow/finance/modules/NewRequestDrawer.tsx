
import { useState } from "react";
import { clsx } from "clsx";
import { X, Save, Send } from "lucide-react";
import { RequestType } from "./RequestTypeSelector";
import { PurchaseRequestForm } from "./PurchaseRequestForm";
import { ReimburseRequestForm } from "./ReimburseRequestForm";

export function NewRequestDrawer({
    isOpen,
    onClose,
    initialType = "PURCHASE",
    hideSwitcher = false,
    initialData,
    onSuccess,
    onDelete
}: {
    isOpen: boolean;
    onClose: () => void;
    initialType?: RequestType;
    hideSwitcher?: boolean;
    initialData?: any;
    onSuccess?: () => void;
    onDelete?: () => Promise<void>;
}) {
    const [requestType, setRequestType] = useState<RequestType>(initialType);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] isolate">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer Detail */}
            <div
                className={clsx(
                    "absolute z-50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 shadow-2xl transition-all duration-500 rounded-[56px] overflow-hidden flex flex-col",
                    "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px]",
                    isOpen ? "translate-y-0 sm:translate-x-0 opacity-100 scale-100" : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0 sm:scale-95"
                )}
            >
                {/* Sticky Header */}
                <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">
                            {initialData ? "Edit Request" : requestType === "PURCHASE" ? "Purchase Request" : "Reimburse Request"}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                        >
                            <X size={20} className="text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Switcher */}
                    {!hideSwitcher && (
                        <div className="bg-neutral-900/5 dark:bg-white/5 p-1 rounded-full flex items-center h-11 relative">
                            <div
                                className={clsx(
                                    "absolute h-9 bg-white dark:bg-neutral-800 rounded-full shadow-sm transition-all duration-300 ease-out",
                                    requestType === "PURCHASE" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+4px)] w-[calc(50%-8px)]"
                                )}
                            />
                            <button
                                onClick={() => setRequestType("PURCHASE")}
                                className={clsx(
                                    "flex-1 h-full px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 relative z-10",
                                    requestType === "PURCHASE" ? "text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                                )}
                            >
                                Purchase
                            </button>
                            <button
                                onClick={() => setRequestType("REIMBURSE")}
                                className={clsx(
                                    "flex-1 h-full px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 relative z-10",
                                    requestType === "REIMBURSE" ? "text-neutral-900 dark:text-white" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                                )}
                            >
                                Reimburse
                            </button>
                        </div>
                    )}
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {requestType === "PURCHASE" ? (
                        <PurchaseRequestForm onClose={onClose} onSuccess={onSuccess} onDelete={onDelete} initialData={initialData} />
                    ) : (
                        <ReimburseRequestForm onClose={onClose} onSuccess={onSuccess} onDelete={onDelete} initialData={initialData} />
                    )}
                </div>
            </div>
        </div>
    );
}
