"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Loader2, Plus } from "lucide-react";
import { searchCatalogResources } from "@/lib/api/resources-client";
import clsx from "clsx";

interface ResourceSearchInputProps {
    value: string;
    category?: string;
    onSelect: (item: { name: string; unit?: string; price?: number; subcategory?: string; group_name?: string }) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ResourceSearchInput({ value, category, onSelect, placeholder, disabled }: ResourceSearchInputProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    const performSearch = async (q: string) => {
        if (!q || q.length < 2) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const data = await searchCatalogResources(q, category);
            setResults(data || []);
        } catch (err) {
            console.error("Search error:", err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQueryChange = (q: string) => {
        setQuery(q);
        setIsOpen(true);

        // Manual entry trigger
        onSelect({ name: q });

        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            performSearch(q);
        }, 400);
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsFocused(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={ref} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => { setIsOpen(true); setIsFocused(true); }}
                    placeholder={placeholder || "Search for item..."}
                    disabled={disabled}
                    className={clsx(
                        "w-full h-11 px-5 text-sm border rounded-full bg-white dark:bg-neutral-800 dark:text-white transition-all font-medium placeholder:text-[11px]",
                        isFocused ? "border-blue-500/30 ring-4 ring-blue-500/[0.08]" : "border-neutral-200 dark:border-neutral-700",
                        disabled && "opacity-60 cursor-not-allowed"
                    )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
                    ) : query ? (
                        <button
                            type="button"
                            onClick={() => { handleQueryChange(""); setIsOpen(false); }}
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <Search className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                </div>
            </div>

            {isOpen && (results.length > 0 || (query && query.length >= 2)) && (
                <div className="absolute z-[200] mt-2 w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1 px-1.5 pt-2 pb-1 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-700/50">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-3">Catalog Suggestions</span>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto scrollbar-hide py-1">
                        {results.map((item) => {
                            const hierarchy = [item.category, item.subcategory, item.group_name].filter(Boolean);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect({
                                            name: item.name,
                                            unit: item.unit,
                                            price: item.price_default,
                                            subcategory: item.subcategory,
                                            group_name: item.group_name
                                        });
                                        setQuery(item.name);
                                        setIsOpen(false);
                                        setIsFocused(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors border-b border-neutral-50 dark:border-neutral-700/30 last:border-0 group"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                                                {item.name}
                                            </div>
                                            <div className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5 flex items-center gap-1 overflow-hidden whitespace-nowrap">
                                                {hierarchy.map((h, i) => (
                                                    <span key={i} className="flex items-center gap-1">
                                                        {h} {i < hierarchy.length - 1 && <span className="text-[8px] opacity-40">/</span>}
                                                    </span>
                                                ))}
                                                <span className="ml-1 opacity-50">• {item.unit || "N/A"}</span>
                                            </div>
                                        </div>
                                        <div className="text-[11px] font-mono font-bold text-neutral-300 dark:text-neutral-600 shrink-0">
                                            Rp {Number(item.price_default || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {/* FALLBACK: ADD CUSTOM */}
                        {query && query.length >= 2 && !results.find(r => r.name.toLowerCase() === query.toLowerCase()) && (
                            <button
                                type="button"
                                onClick={() => { setIsOpen(false); setIsFocused(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors border-t border-dashed border-neutral-200 dark:border-neutral-700 flex items-center gap-3"
                            >
                                <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                                    <Plus className="w-4 h-4 text-neutral-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-neutral-500 italic">Use custom: "{query}"</div>
                                    <div className="text-[10px] text-neutral-400">Not found in standardized catalog</div>
                                </div>
                            </button>
                        )}

                        {!isLoading && query && query.length >= 2 && results.length === 0 && (
                            <div className="px-5 py-8 text-center bg-white dark:bg-neutral-800">
                                <Search className="w-8 h-8 text-neutral-100 dark:text-neutral-800 mx-auto mb-2" strokeWidth={1.5} />
                                <p className="text-xs text-neutral-400 italic">No exact matches for "{query}". <br />Type to use as a custom item.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
