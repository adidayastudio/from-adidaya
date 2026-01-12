"use client";

import React, { useState } from "react";
import { SocialAccount } from "./types/social.types";
import { Plus, Trash2 } from "lucide-react";

type Props = {
    accounts: SocialAccount[];
    onViewAccount: (acc: SocialAccount) => void;
    onEditAccount: (acc: SocialAccount) => void;
    onDeleteAccount: (id: string) => void;
    onAddAccount: () => void;
};

const PLATFORM_CHIP: Record<string, { code: string; color: string }> = {
    INSTAGRAM: { code: "IG", color: "text-pink-600 bg-pink-50" },
    TIKTOK: { code: "TT", color: "text-neutral-900 bg-neutral-100" },
    LINKEDIN: { code: "IN", color: "text-blue-700 bg-blue-50" },
    YOUTUBE: { code: "YT", color: "text-red-600 bg-red-50" },
    FACEBOOK: { code: "FB", color: "text-blue-600 bg-blue-50" }
};

export default function AccountBoardView({ accounts, onViewAccount, onEditAccount, onDeleteAccount, onAddAccount }: Props) {

    return (
        <div className="grid grid-cols-4 gap-4">
            {accounts.map(acc => {
                const chip = PLATFORM_CHIP[acc.platform] || { code: "??", color: "bg-neutral-100" };
                const code = acc.name.slice(0, 3).toUpperCase();

                return (
                    <div
                        key={acc.id}
                        onClick={() => onViewAccount(acc)}
                        className="bg-white rounded-xl p-5 border border-neutral-100 hover:shadow-lg hover:border-neutral-200 transition-all cursor-pointer group"
                    >
                        {/* HEADER: Logo placeholder + Actions */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500 text-sm font-bold">
                                {code}
                            </div>

                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditAccount(acc); }}
                                    className="text-[10px] text-neutral-500 hover:text-neutral-900 bg-neutral-100 px-2 py-1 rounded transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteAccount(acc.id); }}
                                    className="p-1 rounded bg-neutral-100 text-neutral-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* NAME */}
                        <h3 className="text-base font-semibold text-neutral-900 mb-2">{acc.name}</h3>

                        {/* PLATFORM CHIP + HANDLE */}
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${chip.color}`}>
                                {chip.code}
                            </span>
                            <a
                                href={`https://${acc.platform.toLowerCase()}.com/${acc.handle.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-neutral-500 hover:underline"
                            >
                                {acc.handle}
                            </a>
                        </div>
                    </div>
                );
            })}

            {/* ADD CARD */}
            <button
                onClick={onAddAccount}
                className="border-2 border-dashed border-neutral-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-neutral-300 hover:bg-neutral-50/50 transition-all min-h-[140px]"
            >
                <Plus className="w-5 h-5 text-neutral-300" />
                <span className="text-sm font-medium text-neutral-400">Add Account</span>
            </button>
        </div>
    );
}
