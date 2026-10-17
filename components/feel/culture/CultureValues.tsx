"use client";

import { Heart, Users, Zap, Calendar, CheckCircle2, BookOpen } from "lucide-react";
import clsx from "clsx";

interface CultureValuesProps {
    onNavigate?: (section: string) => void;
}

// --- MOCK DATA ---
const CORE_VALUES = [
    {
        id: "value-1",
        name: "Customer Obsession",
        tagline: "Start with the customer and work backward.",
        description: "Kita tidak hanya memuaskan pelanggan, tapi berusaha memukau mereka. Setiap keputusan diambil dengan mempertimbangkan dampak bagi customer.",
        points: [
            "Selalu tanya: 'Apakah ini mempermudah hidup customer?'",
            "Dengarkan feedback, bahkan yang menyakitkan.",
            "Prioritaskan solusi jangka panjang daripada keuntungan sesaat."
        ],
        icon: Heart,
        color: "text-red-500",
        bg: "bg-red-50"
    },
    {
        id: "value-2",
        name: "Radical Ownership",
        tagline: "Act like an owner, not a renter.",
        description: "Tidak ada istilah 'itu bukan tugasku'. Kita peduli pada hasil akhir perusahaan, bukan hanya deskripsi pekerjaan sendiri.",
        points: [
            "Ambil inisiatif tanpa menunggu disuruh.",
            "Bertanggung jawab penuh atas kesuksesan dan kegagalan.",
            "Jaga aset perusahaan seolah milik sendiri."
        ],
        icon: CheckCircle2,
        color: "text-blue-500",
        bg: "bg-blue-50"
    },
    {
        id: "value-3",
        name: "Be Kind & Direct",
        tagline: "Challenge directly, care personally.",
        description: "Kita percaya bahwa kejujuran adalah bentuk kepedulian tertinggi. Sampaikan kritik dengan jelas namun tetap penuh empati.",
        points: [
            "Berikan feedback yang bisa ditindaklanjuti.",
            "Hargai perbedaan pendapat.",
            "Jangan bicarakan orang di belakang."
        ],
        icon: Users,
        color: "text-emerald-500",
        bg: "bg-emerald-50"
    }
];

const RITUALS = [
    {
        id: "ritual-1",
        name: "Morning Sync",
        timing: "Daily, 09:00 AM",
        purpose: "Menyamakan fokus hari ini dan identifikasi bloker.",
        relatedValue: "Radical Ownership",
        icon: Zap
    },
    {
        id: "ritual-2",
        name: "Friday Wins",
        timing: "Weekly, Friday 16:00 PM",
        purpose: "Merayakan kemenangan kecil dan belajar dari kegagalan minggu ini.",
        relatedValue: "Be Kind & Direct",
        icon: Calendar
    }
];

export function CultureValues({ onNavigate }: CultureValuesProps) {
    return (
        <div className="w-full pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. HEADER (Consistent with CultureHome/Journey) */}
            <div className="space-y-4 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Values</h1>
                        <p className="text-sm text-neutral-500 mt-1">What We Believe & Practice</p>
                    </div>
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* 2. INTRO SECTION */}
            <div className="mb-10 max-w-2xl">
                <p className="text-neutral-600 leading-relaxed text-lg">
                    Di Adidaya, <strong>Values</strong> bukan sekadar poster di dinding. Ini adalah cara kita mengambil keputusan saat tidak ada atasan yang melihat. Ini adalah bahasa bersama yang menyatukan langkah kita.
                </p>
            </div>

            {/* 3. CORE VALUES SECTION */}
            <div className="mb-12">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-6">Core Values</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {CORE_VALUES.map((value) => {
                        const Icon = value.icon;
                        return (
                            <div key={value.id} className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                                <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors", value.bg, value.color)}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <h4 className="text-xl font-bold text-neutral-900 mb-1">{value.name}</h4>
                                <p className={clsx("text-sm font-medium mb-4 italic", value.color)}>{value.tagline}</p>

                                <p className="text-sm text-neutral-600 mb-6 leading-relaxed flex-grow">
                                    {value.description}
                                </p>

                                <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                                    <h5 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">In Practice</h5>
                                    <ul className="space-y-2">
                                        {value.points.map((point, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-neutral-600">
                                                <div className={clsx("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", value.color.replace("text-", "bg-"))} />
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. RITUALS SECTION */}
            <div className="mb-12">
                <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-6">Our Rituals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {RITUALS.map((ritual) => {
                        const Icon = ritual.icon;
                        return (
                            <div key={ritual.id} className="bg-white rounded-xl border border-neutral-200 p-5 flex items-start gap-4 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 flex-shrink-0">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-neutral-900">{ritual.name}</h4>
                                        <span className="text-[10px] font-medium bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                            {ritual.timing}
                                        </span>
                                    </div>
                                    <p className="text-sm text-neutral-600 mb-3">{ritual.purpose}</p>
                                    <div className="inline-flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-50 px-2 py-1 rounded border border-neutral-100">
                                        <BookOpen className="w-3 h-3" />
                                        <span>Practicing: <span className="font-medium text-neutral-600">{ritual.relatedValue}</span></span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 5. CLOSING NOTE */}
            <div className="text-center py-8 border-t border-neutral-200">
                <p className="text-neutral-500 italic max-w-xl mx-auto">
                    "Values are not rules on paper, but habits we repeat together."
                </p>
            </div>
        </div>
    );
}
