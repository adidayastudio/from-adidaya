
import { useState } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
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
                    "fixed top-6 bottom-6 right-6 z-50 bg-white/30 backdrop-blur-[40px] saturate-[180%] border border-white/40 shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden flex flex-col",
                    isOpen ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95",
                    "w-full max-w-[calc(100vw-3rem)] sm:w-[500px]"
                )}
            >
                {/* Header */}
                <div className="flex-none px-6 pt-8 pb-4 bg-white/5 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                                {requestType === "PURCHASE" ? "Purchase Request" : "Reimburse Request"}
                            </h2>
                            <p className="text-sm text-neutral-600 font-medium mt-1">
                                {requestType === "PURCHASE"
                                    ? "Create a new purchase request for material, tools, or services."
                                    : "Submit a claim for out-of-pocket expenses."
                                }
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100/50 rounded-full transition-all duration-200"
                        >
                            <X className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Switcher */}
                    {!hideSwitcher && (
                        <div className="bg-neutral-900/5 p-1 rounded-full flex items-center h-11 relative">
                            <div
                                className={clsx(
                                    "absolute h-9 bg-white rounded-full shadow-sm transition-all duration-300 ease-out",
                                    requestType === "PURCHASE" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+4px)] w-[calc(50%-8px)]"
                                )}
                            />
                            <button
                                onClick={() => setRequestType("PURCHASE")}
                                className={clsx(
                                    "flex-1 h-full px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 relative z-10",
                                    requestType === "PURCHASE" ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                Purchase
                            </button>
                            <button
                                onClick={() => setRequestType("REIMBURSE")}
                                className={clsx(
                                    "flex-1 h-full px-4 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 relative z-10",
                                    requestType === "REIMBURSE" ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                                )}
                            >
                                Reimburse
                            </button>
                        </div>
                    )}
                </div>

                {/* Form Container (Scrollable) */}
                <div className="flex-1 overflow-y-auto scrollbar-hide pb-2">
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
