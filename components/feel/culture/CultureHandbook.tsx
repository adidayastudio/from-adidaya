"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { Book, ChevronDown, AlignLeft, Search } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

interface CultureHandbookProps {
    onNavigate?: (section: string) => void;
}

// --- MOCK CONTENT SECTIONS ---
const HANDBOOK_SECTIONS = [
    {
        id: "intro",
        title: "Introduction",
        content: (
            <div className="space-y-4">
                <p className="text-lg text-neutral-600 leading-relaxed">
                    Handbook ini adalah "living document" yang merangkum cara kita bekerja, berinteraksi, dan mengambil keputusan di Adidaya.
                    Ini bukan buku aturan hukum, melainkan kesepakatan bersama untuk menjaga budaya kita tetap sehat dan produktif.
                </p>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
                    <strong>Tip:</strong> Gunakan dokumen ini sebagai referensi utama saat Anda ragu tentang prosedur atau norma tim.
                </div>
            </div>
        )
    },
    {
        id: "principles",
        title: "Working Principles",
        content: (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">1. Default to Open</h3>
                    <p className="text-neutral-600">
                        Kami percaya informasi harus dapat diakses oleh semua orang kecuali ada alasan kuat untuk merahasiakannya (seperti data pribadi atau sensitif).
                        Dokumentasikan pekerjaan Anda di ruang publik tim, bukan di DM pribadi.
                    </p>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">2. Bias for Action</h3>
                    <p className="text-neutral-600">
                        Kecepatan itu penting. Lebih baik mengambil keputusan yang "cukup baik" sekarang daripada keputusan "sempurna" minggu depan.
                        Kesalahan akibat tindakan lebih dihargai daripada kelambanan akibat analisis berlebihan.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: "communication",
        title: "Communication & Collaboration",
        content: (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">Async First</h3>
                    <p className="text-neutral-600">
                        Kita menghargai waktu fokus ("deep work"). Jangan mengharapkan balasan instan di Slack/Teams.
                        Tulis pesan dengan konteks lengkap agar penerima bisa menjawab tanpa perlu bolak-balik bertanya.
                    </p>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">Meeting Etiquette</h3>
                    <ul className="list-disc pl-5 space-y-2 text-neutral-600">
                        <li>Tidak ada agenda = tidak ada meeting.</li>
                        <li>Mulai lewat dari 5 menit? Mulai saja tanpa menunggu yang terlambat.</li>
                        <li>Selalu akhiri dengan "Action Items" yang jelas (Siapa melakukan Apa, Kapan).</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: "decision-making",
        title: "Decision Making",
        content: (
            <div className="space-y-6">
                <p className="text-neutral-600">
                    Kita menggunakan kerangka kerja <strong>DACI</strong> untuk keputusan besar:
                </p>
                <ul className="space-y-3 text-neutral-600">
                    <li className="flex gap-2">
                        <span className="font-bold w-16 flex-shrink-0">Driver:</span>
                        <span>Orang yang bertanggung jawab mengawal proses keputusan dari awal hingga akhir.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold w-16 flex-shrink-0">Approver:</span>
                        <span>Satu orang (ya, cuma satu) yang punya hak veto atau ketuk palu akhir.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold w-16 flex-shrink-0">Contributors:</span>
                        <span>Orang-orang yang memberikan masukan dan data.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold w-16 flex-shrink-0">Informed:</span>
                        <span>Orang-orang yang perlu tahu hasil keputusannya.</span>
                    </li>
                </ul>
            </div>
        )
    },
    {
        id: "ethics",
        title: "Code of Conduct",
        content: (
            <div className="space-y-4">
                <p className="text-neutral-600">
                    Adidaya berkomitmen menyediakan lingkungan kerja yang aman dan inklusif. Kami tidak mentolerir pelecehan, diskriminasi, atau perilaku toksik dalam bentuk apa pun.
                </p>
                <p className="text-neutral-600">
                    Jika Anda melihat atau mengalami pelanggaran, laporkan ke HR atau melalui saluran pelaporan anonim kami. Keamanan psikologis Anda adalah prioritas utama.
                </p>
            </div>
        )
    }
];

export function CultureHandbook({ onNavigate }: CultureHandbookProps) {
    const [activeSection, setActiveSection] = useState("intro");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Smooth scroll handler
    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(`section-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Adjust for sticky header offset if needed, usually css 'scroll-margin-top' handles this
        }
        setIsMobileMenuOpen(false);
    };

    // Intersection Observer to update active section on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('section-', '');
                        setActiveSection(id);
                    }
                });
            },
            { rootMargin: '-20% 0px -60% 0px' }
        );

        HANDBOOK_SECTIONS.forEach((section) => {
            const el = document.getElementById(`section-${section.id}`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const activeTitle = HANDBOOK_SECTIONS.find(s => s.id === activeSection)?.title || "Select Section";

    return (
        <div className="w-full pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. HEADER */}
            <div className="space-y-4 mb-4 md:mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900">Handbook</h1>
                        <p className="text-sm text-neutral-500 mt-1">How We Work at Adidaya</p>
                    </div>
                    {/* Search Mockup (Optional - Visual Only) */}
                    <div className="hidden md:flex items-center bg-white border border-neutral-200 rounded-full px-4 py-2 w-64 shadow-sm">
                        <Search className="w-4 h-4 text-neutral-400 mr-2" />
                        <span className="text-sm text-neutral-400">Search handbook...</span>
                    </div>
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* MOBILE NAVIGATION DRAWER/DROPDOWN */}
            <div className="md:hidden mb-8 sticky top-0 z-40 bg-neutral-50 pt-2 pb-4">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm"
                >
                    <div className="flex items-center gap-2 font-semibold text-neutral-900">
                        <AlignLeft className="w-4 h-4 text-neutral-500" />
                        {activeTitle}
                    </div>
                    <ChevronDown className={clsx("w-4 h-4 text-neutral-400 transition-transform", isMobileMenuOpen && "rotate-180")} />
                </button>

                {isMobileMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                        {HANDBOOK_SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={clsx(
                                    "w-full text-left px-4 py-3 text-sm rounded-lg transition-colors",
                                    activeSection === section.id ? "bg-blue-50 text-blue-700 font-medium" : "text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                {section.title}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* DESKTOP LAYOUT (2 Column) */}
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12 align-start">

                {/* LEFT: STICKY TOC */}
                <div className="hidden md:block w-64 flex-shrink-0 sticky top-8 self-start max-h-[calc(100vh-100px)] overflow-y-auto">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4 px-3">Table of Contents</h3>
                    <nav className="space-y-1">
                        {HANDBOOK_SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={clsx(
                                    "w-full text-left px-3 py-2 text-sm rounded-lg transition-all border-l-2",
                                    activeSection === section.id
                                        ? "bg-white border-blue-500 text-blue-700 font-medium shadow-sm"
                                        : "border-transparent text-neutral-600 hover:bg-white/50 hover:text-neutral-900"
                                )}
                            >
                                {section.title}
                            </button>
                        ))}
                    </nav>

                    {/* Optional Helper Link */}
                    <div className="mt-8 px-3">
                        <div className="bg-neutral-100 rounded-lg p-3 text-xs text-neutral-500">
                            Can't find what you need?<br />
                            <a href="#" className="text-blue-600 hover:underline mt-1 inline-block">Ask HR or your lead</a>
                        </div>
                    </div>
                </div>

                {/* RIGHT: MAIN CONTENT */}
                <div className="flex-1 min-w-0 space-y-12">
                    {HANDBOOK_SECTIONS.map((section) => (
                        <section
                            key={section.id}
                            id={`section-${section.id}`}
                            className="scroll-mt-24 group border-b border-neutral-100 pb-12 last:border-0"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                                    <Book className="w-4 h-4" />
                                </div>
                                <h2 className="text-2xl font-bold text-neutral-900 group-hover:text-blue-700 transition-colors">
                                    {section.title}
                                </h2>
                            </div>
                            <div className="prose prose-neutral max-w-none">
                                {section.content}
                            </div>
                        </section>
                    ))}

                    <div className="pt-8 text-center">
                        <p className="text-sm text-neutral-400 italic">Last updated: Oct 12, 2024</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
