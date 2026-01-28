
import { clsx } from "clsx";
import { X, ShoppingCart, Receipt } from "lucide-react";
import { RequestType } from "./RequestTypeSelector";

export function RequestChoiceDrawer({
    isOpen,
    onClose,
    onSelect
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: RequestType) => void;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] isolate">
            <div
                className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            <div
                className={clsx(
                    "fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-[40px] border-t border-white/40 shadow-2xl transition-all duration-500 rounded-t-[2.5rem] overflow-hidden flex flex-col p-8 pb-12",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">New Request</h2>
                        <p className="text-sm text-neutral-500 font-medium">Select type of request you want to create.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100/50 rounded-full transition-all duration-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => onSelect("PURCHASE")}
                        className="flex items-center gap-4 p-6 bg-red-50 hover:bg-red-100 border border-red-100 rounded-[2rem] transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-neutral-900">Purchase Request</h3>
                            <p className="text-sm text-neutral-500">Materials, tools, or service bills</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect("REIMBURSE")}
                        className="flex items-center gap-4 p-6 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-[2rem] transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/20 group-hover:scale-110 transition-transform">
                            <Receipt className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-bold text-neutral-900">Reimburse Request</h3>
                            <p className="text-sm text-neutral-500">Out-of-pocket expense claims</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
