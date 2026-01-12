"use client";

import React, { useState, useMemo } from "react";
import { Eye, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { SocialAccount } from "./types/social.types";

type Props = {
    accounts: SocialAccount[];
    onViewAccount: (acc: SocialAccount) => void;
    onEditAccount: (acc: SocialAccount) => void;
    onDeleteAccount: (id: string) => void;
    onAddAccount: () => void;
};

type SortKey = "name" | "platform" | "code";
type SortDir = "asc" | "desc";

const PLATFORM_BADGE: Record<string, { code: string; color: string }> = {
    INSTAGRAM: { code: "IG", color: "text-pink-600 bg-pink-50" },
    TIKTOK: { code: "TT", color: "text-neutral-900 bg-neutral-100" },
    LINKEDIN: { code: "IN", color: "text-blue-700 bg-blue-50" },
    YOUTUBE: { code: "YT", color: "text-red-600 bg-red-50" },
    FACEBOOK: { code: "FB", color: "text-blue-600 bg-blue-50" }
};

export default function AccountListView({ accounts, onViewAccount, onEditAccount, onDeleteAccount, onAddAccount }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const sortedAccounts = useMemo(() => {
        return [...accounts].sort((a, b) => {
            let cmp = 0;
            if (sortKey === "name") cmp = a.name.localeCompare(b.name);
            if (sortKey === "platform") cmp = a.platform.localeCompare(b.platform);
            if (sortKey === "code") cmp = a.name.slice(0, 3).localeCompare(b.name.slice(0, 3));
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [accounts, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        const isActive = sortKey === colKey;
        const iconClass = isActive ? "text-neutral-700" : "text-neutral-300";
        return (
            <span className={`ml-1 inline-flex ${iconClass}`}>
                {isActive && sortDir === "desc"
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronUp className="w-3 h-3" />
                }
            </span>
        );
    };

    const handleDelete = (id: string) => {
        if (deleteConfirm === id) {
            onDeleteAccount(id);
            setDeleteConfirm(null);
        } else {
            setDeleteConfirm(id);
        }
    };

    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-neutral-100">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead>
                        <tr className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 bg-neutral-50/50">
                            <th
                                className="px-4 py-3 font-medium cursor-pointer hover:text-neutral-600 transition-colors"
                                onClick={() => toggleSort("name")}
                            >
                                Account <SortIcon colKey="name" />
                            </th>
                            <th
                                className="px-4 py-3 font-medium cursor-pointer hover:text-neutral-600 transition-colors"
                                onClick={() => toggleSort("platform")}
                            >
                                Platform <SortIcon colKey="platform" />
                            </th>
                            <th
                                className="px-4 py-3 font-medium cursor-pointer hover:text-neutral-600 transition-colors"
                                onClick={() => toggleSort("code")}
                            >
                                Code <SortIcon colKey="code" />
                            </th>
                            <th className="px-4 py-3 font-medium">Handle</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAccounts.map(acc => {
                            const badge = PLATFORM_BADGE[acc.platform] || { code: "??", color: "bg-neutral-100" };
                            const code = acc.name.slice(0, 3).toUpperCase();
                            const isDeleting = deleteConfirm === acc.id;

                            return (
                                <tr
                                    key={acc.id}
                                    className="hover:bg-neutral-50/70 transition-colors group border-b border-neutral-50 last:border-b-0"
                                >
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => onViewAccount(acc)}
                                            className="text-sm font-medium text-neutral-900 hover:text-red-600 transition-colors"
                                        >
                                            {acc.name}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.color}`}>
                                            {badge.code}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-bold text-neutral-500">{code}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <a
                                            href={`https://${acc.platform.toLowerCase()}.com/${acc.handle.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-sm text-neutral-600 hover:underline transition-colors"
                                        >
                                            {acc.handle}
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => onViewAccount(acc)}
                                                className="p-1.5 rounded bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                                                title="View"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onEditAccount(acc)}
                                                className="p-1.5 rounded bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(acc.id)}
                                                className={`p-1.5 rounded transition-colors ${isDeleting
                                                        ? "bg-red-500 text-white"
                                                        : "bg-neutral-100 text-neutral-500 hover:bg-red-100 hover:text-red-600"
                                                    }`}
                                                title={isDeleting ? "Click again to confirm" : "Delete"}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {accounts.length === 0 && (
                <div className="p-12 text-center">
                    <p className="text-sm text-neutral-400 mb-4">No accounts yet.</p>
                    <button
                        onClick={onAddAccount}
                        className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                    >
                        + Add your first account
                    </button>
                </div>
            )}
        </div>
    );
}
