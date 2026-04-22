"use client";

import { useState } from "react";
import { X, UserPlus, Mail, Shield, User, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import clsx from "clsx";

interface AddPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddPersonModal({ isOpen, onClose, onSuccess }: AddPersonModalProps) {
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("staff");
    const [password, setPassword] = useState(""); // Support custom initial password
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/admin/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    fullName,
                    role,
                    password: password || "Adidaya123!" // Default if empty
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create user");
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-white/20 dark:border-neutral-800 animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-sm border border-blue-100 dark:border-blue-500/20">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">Add New Person</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Invite someone to join the Adidaya platform.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-90">
                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                                <CheckCircle2 size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">User Created!</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">The account is ready for use.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex gap-3 items-center text-red-600 animate-in slide-in-from-top-2">
                                    <AlertCircle size={18} />
                                    <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Full Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="Enter full name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                        <input
                                            required
                                            type="email"
                                            placeholder="name@adidayastudio.id"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Role & Initial Password Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-1">System Role</label>
                                        <div className="relative">
                                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                            <select
                                                value={role}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
                                            >
                                                <option value="staff">Staff</option>
                                                <option value="supervisor">Supervisor</option>
                                                <option value="finance">Finance</option>
                                                <option value="admin">Admin</option>
                                                <option value="operational">Operational</option>
                                                <option value="site">Site</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest px-1 text-right">Initial PW (Opt)</label>
                                        <input
                                            type="text"
                                            placeholder="Standard if empty"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1 !rounded-2xl h-12 font-bold"
                                    onClick={onClose}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-3 !rounded-2xl h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 font-bold"
                                    disabled={isLoading}
                                    icon={isLoading ? <Loader2 className="animate-spin" /> : <UserPlus className="w-5 h-5" />}
                                >
                                    {isLoading ? "Creating..." : "Create Account"}
                                </Button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
