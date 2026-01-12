"use client";

import { useState, useMemo } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import {
    AHSP_DATA,
    AHSP_CATEGORY_LABELS,
    searchAHSP,
    formatPrice
} from "./data/ahsp.data";
import type { AHSPItem, AHSPCategory } from "./data/ahsp.types";

type AHSPPickerModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (item: AHSPItem) => void;
};

export function AHSPPickerModal({ isOpen, onClose, onSelect }: AHSPPickerModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<AHSPCategory | null>(null);
    const [previewItem, setPreviewItem] = useState<AHSPItem | null>(null);

    // Get all categories
    const categories = Object.entries(AHSP_CATEGORY_LABELS) as [AHSPCategory, string][];

    // Filter items based on search and category
    const filteredItems = useMemo(() => {
        if (searchQuery.trim()) {
            return searchAHSP(searchQuery, selectedCategory || undefined);
        }
        if (selectedCategory) {
            return AHSP_DATA.filter(item => item.category === selectedCategory);
        }
        return AHSP_DATA;
    }, [searchQuery, selectedCategory]);

    const handleSelect = (item: AHSPItem) => {
        onSelect(item);
        handleClose();
    };

    const handleClose = () => {
        setSearchQuery("");
        setSelectedCategory(null);
        setPreviewItem(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                    <div>
                        <h3 className="text-base font-semibold text-neutral-900">Pilih Item AHSP</h3>
                        <p className="text-xs text-neutral-500 mt-0.5">Analisa Harga Satuan Pekerjaan</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="px-5 py-3 border-b border-neutral-100">
                    <div className="flex gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari berdasarkan kode atau nama pekerjaan..."
                                className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/40"
                                autoFocus
                            />
                        </div>

                        {/* Category Filter */}
                        <select
                            value={selectedCategory || ""}
                            onChange={(e) => setSelectedCategory(e.target.value as AHSPCategory || null)}
                            className="px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red/40 bg-white"
                        >
                            <option value="">Semua Kategori</option>
                            {categories.map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Items List */}
                    <div className="flex-1 overflow-auto">
                        {filteredItems.length === 0 ? (
                            <div className="p-8 text-center text-neutral-500">
                                <p className="text-sm">Tidak ada item yang ditemukan</p>
                                <p className="text-xs mt-1">Coba kata kunci lain atau ubah filter kategori</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-neutral-100">
                                {filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-4 px-5 py-3 hover:bg-neutral-50 cursor-pointer transition-colors ${previewItem?.id === item.id ? "bg-neutral-50" : ""
                                            }`}
                                        onClick={() => setPreviewItem(item)}
                                        onDoubleClick={() => handleSelect(item)}
                                    >
                                        {/* Code Badge */}
                                        <div className="shrink-0 px-2 py-1 bg-neutral-100 rounded text-xs font-mono font-medium text-neutral-600">
                                            {item.code}
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-neutral-900 truncate">
                                                {item.name}
                                            </div>
                                            {item.nameId && (
                                                <div className="text-xs text-neutral-400 truncate">
                                                    {item.nameId}
                                                </div>
                                            )}
                                        </div>

                                        {/* Category */}
                                        <div className="shrink-0 text-xs text-neutral-400">
                                            {AHSP_CATEGORY_LABELS[item.category]}
                                        </div>

                                        {/* Unit & Price */}
                                        <div className="shrink-0 text-right">
                                            <div className="text-sm font-medium text-neutral-900">
                                                {formatPrice(item.unitPrice)}
                                            </div>
                                            <div className="text-xs text-neutral-400">
                                                per {item.unit}
                                            </div>
                                        </div>

                                        <ChevronRight className="shrink-0 w-4 h-4 text-neutral-300" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview Panel */}
                    {previewItem && (
                        <div className="w-80 border-l border-neutral-100 bg-neutral-50/50 overflow-auto">
                            <div className="p-4 space-y-4">
                                {/* Header */}
                                <div>
                                    <div className="text-xs font-medium text-neutral-400 mb-1">
                                        {AHSP_CATEGORY_LABELS[previewItem.category]}
                                    </div>
                                    <div className="text-lg font-semibold text-neutral-900">
                                        {previewItem.name}
                                    </div>
                                    <div className="text-sm text-neutral-500">
                                        Kode: {previewItem.code}
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="p-3 bg-white rounded-lg border border-neutral-200">
                                    <div className="text-xs text-neutral-400 mb-1">Harga Satuan</div>
                                    <div className="text-xl font-bold text-neutral-900">
                                        {formatPrice(previewItem.unitPrice)}
                                    </div>
                                    <div className="text-sm text-neutral-500">per {previewItem.unit}</div>
                                </div>

                                {/* Breakdown */}
                                {(previewItem.laborTotal || previewItem.materialTotal || previewItem.equipmentTotal) && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-neutral-400">Rincian</div>

                                        {previewItem.laborTotal && previewItem.laborTotal > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600">Tenaga Kerja</span>
                                                <span className="font-medium">{formatPrice(previewItem.laborTotal)}</span>
                                            </div>
                                        )}

                                        {previewItem.materialTotal && previewItem.materialTotal > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600">Bahan</span>
                                                <span className="font-medium">{formatPrice(previewItem.materialTotal)}</span>
                                            </div>
                                        )}

                                        {previewItem.equipmentTotal && previewItem.equipmentTotal > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600">Peralatan</span>
                                                <span className="font-medium">{formatPrice(previewItem.equipmentTotal)}</span>
                                            </div>
                                        )}

                                        {previewItem.overhead && previewItem.overhead > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-600">Overhead & Profit</span>
                                                <span className="font-medium">{formatPrice(previewItem.overhead)}</span>
                                            </div>
                                        )}

                                        <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-medium">
                                            <span>Total</span>
                                            <span>{formatPrice(previewItem.unitPrice)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Select Button */}
                                <Button
                                    className="w-full"
                                    onClick={() => handleSelect(previewItem)}
                                >
                                    Pilih Item Ini
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                    <div className="text-xs text-neutral-400">
                        {filteredItems.length} item ditemukan • Double-click untuk pilih
                    </div>
                    <Button size="sm" variant="secondary" onClick={handleClose}>
                        Batal
                    </Button>
                </div>
            </div>
        </div>
    );
}
