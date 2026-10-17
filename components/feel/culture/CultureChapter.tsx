"use client";

import { useState, useMemo } from "react";
import clsx from "clsx";
import {
    Lock,
    ArrowRight,
    FileText,
    HelpCircle,
    Check,
    Award,
    ChevronDown,
    ChevronLeft,
    X,
    Clock
} from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

interface CultureChapterProps {
    onBack?: () => void;
}

// --- MOCK DATA: CHAPTER 1 ---
const CHAPTER_DATA = {
    id: 1,
    title: "Chapter 1: Adaptation",
    subtitle: "Finding your rhythm in the new environment.",
    duration: "15 min",
    stats: { totalSteps: 4 },
    steps: [
        {
            id: "s1",
            type: "content",
            contentType: "Article",
            title: "Welcome to Adidaya",
            duration: "3 min",
            content: {
                intro: "Selamat datang di keluarga besar Adidaya. Minggu pertamamu adalah tentang observasi dan adaptasi. Jangan ragu untuk bertanya.",
                sections: [
                    { title: "Our Mission", body: "Membangun ekosistem kerja yang memanusiakan manusia." },
                    { title: "Your First Week", body: "Fokus pada pengenalan alat kerja, tim, dan budaya komunikasi kami." }
                ],
                highlight: "Pro Tip: Jadwalkan sesi 1-on-1 dengan minimal 3 rekan tim minggu ini."
            }
        },
        {
            id: "s2",
            type: "content",
            contentType: "Case Study",
            title: "Case: The 'Open Door' Policy",
            duration: "5 min",
            content: {
                intro: "Di Adidaya, jabatan bukan penghalang komunikasi. Simak skenario berikut tentang bagaimana ide junior didengar oleh manajemen.",
                sections: [
                    { title: "The Situation", body: "Andi (Staff) melihat inefisiensi di gudang. Dia ragu melapor ke Budi (Manager)." },
                    { title: "The Action", body: "Andi memberanikan diri mengirim pesan singkat ide perbaikan. Budi merespons positif dan mengajak diskusi." }
                ],
                highlight: "Key Takeaway: Speak up with respect regardless of hierarchy."
            }
        },
        {
            id: "s3",
            type: "content",
            contentType: "Value Focus",
            title: "Value: Humility",
            duration: "2 min",
            content: {
                intro: "Humility (Kerendahan Hati) adalah fondasi belajar. Kita mengakui ketidaktahuan agar bisa diisi dengan pengetahuan baru.",
                sections: [
                    { title: "In Practice", body: "Berani berkata 'Saya belum tahu, tolong ajari saya' adalah tanda kekuatan, bukan kelemahan." }
                ]
            }
        },
        {
            id: "s4",
            type: "quiz",
            contentType: "Reflection",
            title: "Chapter Reflection",
            duration: "5 min",
            description: "Refleksikan apa yang sudah Anda pelajari.",
            questions: [
                { id: 1, text: "Apa yang harus dilakukan jika melihat masalah tapi itu bukan tugas utama Anda?", options: ["Abaikan", "Laporkan & Beri Solusi", "Mengeluh di belakang"] },
                { id: 2, text: "Nilai apa yang paling relevan saat Anda melakukan kesalahan?", options: ["Denial", "Humility", "Aggression"] }
            ]
        }
    ]
};

export function CultureChapter({ onBack }: CultureChapterProps) {
    // STATE
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
    const [isQuizSubmitted, setIsQuizSubmitted] = useState(false);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

    // DERIVED STATE
    const activeStep = CHAPTER_DATA.steps[activeStepIndex];
    const isLastStep = activeStepIndex === CHAPTER_DATA.steps.length - 1;
    const isChapterCompleted = isQuizSubmitted;

    // Check if current step is complete
    const isCurrentStepComplete = useMemo(() => {
        if (activeStep.type === "quiz") return isQuizSubmitted;
        return completedStepIds.includes(activeStep.id);
    }, [activeStep, completedStepIds, isQuizSubmitted]);

    // Can proceed logic
    const canProceed = useMemo(() => {
        if (activeStep.type === "quiz") {
            const questionCount = activeStep.questions?.length || 0;
            return Object.keys(quizAnswers).length === questionCount && !isQuizSubmitted;
        }
        return true;
    }, [activeStep, quizAnswers, isQuizSubmitted]);

    // ACTIONS
    const handleNext = () => {
        if (!completedStepIds.includes(activeStep.id)) {
            setCompletedStepIds(prev => [...prev, activeStep.id]);
        }
        if (activeStep.type === "quiz") {
            setIsQuizSubmitted(true);
            return;
        }
        if (!isLastStep) {
            setActiveStepIndex(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrev = () => {
        if (activeStepIndex > 0) {
            setActiveStepIndex(prev => prev - 1);
        }
    };

    const handleStepClick = (index: number) => {
        if (index <= completedStepIds.length) {
            setActiveStepIndex(index);
            setIsMobileDrawerOpen(false);
        }
    };

    // --- RENDER HELPERS ---

    const StepsList = () => (
        <div className="space-y-6">
            <div className="px-4 lg:px-0">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 mb-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Active</span>
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-neutral-900 leading-tight">{CHAPTER_DATA.title}</h1>
                <p className="text-neutral-500 text-sm mt-1">{CHAPTER_DATA.subtitle}</p>

                <div className="mt-6 flex items-center gap-3 text-sm font-medium text-neutral-600">
                    <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${(completedStepIds.length / CHAPTER_DATA.steps.length) * 100}%` }}
                        />
                    </div>
                    <span>{completedStepIds.length}/{CHAPTER_DATA.steps.length}</span>
                </div>
            </div>

            <div className="space-y-1 px-2 lg:px-0">
                {CHAPTER_DATA.steps.map((step, idx) => {
                    const isCompleted = completedStepIds.includes(step.id);
                    const isActive = idx === activeStepIndex;
                    const isLocked = idx > completedStepIds.length;

                    return (
                        <button
                            key={step.id}
                            disabled={isLocked}
                            onClick={() => handleStepClick(idx)}
                            className={clsx(
                                "w-full flex items-start text-left gap-3 p-3 rounded-xl transition-all border",
                                isActive ? "bg-white border-blue-200 shadow-sm ring-1 ring-blue-50" : "bg-transparent border-transparent hover:bg-neutral-50",
                                isLocked && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <div className={clsx(
                                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 transition-colors",
                                isCompleted ? "bg-emerald-100 text-emerald-600" :
                                    isActive ? "bg-blue-600 text-white" :
                                        isLocked ? "bg-neutral-100 text-neutral-400" : "bg-neutral-200 text-neutral-600"
                            )}>
                                {isCompleted ? <Check className="w-4 h-4" /> :
                                    isLocked ? <Lock className="w-3 h-3" /> : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={clsx("text-sm font-medium truncate", isActive ? "text-neutral-900" : "text-neutral-600")}>
                                    {step.title}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                                        {step.contentType}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {step.duration}
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderContent = () => {
        if (isChapterCompleted) {
            return (
                <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-green-200 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100/50">
                        <Award className="w-12 h-12 text-emerald-700" />
                    </div>
                    <h2 className="text-3xl font-bold text-neutral-900 mb-3">Chapter Completed!</h2>
                    <p className="text-lg text-neutral-600 max-w-md mx-auto mb-8">
                        Great job reflecting on this chapter. Your progress has been saved to your Journey.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                        <Button onClick={onBack} variant="outline" className="flex-1 justify-center h-12 text-base !rounded-full">
                            Back to Home
                        </Button>
                        <Button className="flex-1 justify-center h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white !rounded-full">
                            View My Journey
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8 shadow-sm mb-6">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                        {activeStep.contentType}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">{activeStep.title}</h2>
                    <div className="flex items-center gap-2 text-neutral-500 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{activeStep.duration} read</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8 shadow-sm space-y-8">
                    {activeStep.content?.intro && (
                        <p className="text-lg text-neutral-700 leading-relaxed font-medium">
                            {activeStep.content.intro}
                        </p>
                    )}

                    {activeStep.type === "quiz" && (
                        <div className="space-y-8">
                            {activeStep.description && <p className="text-neutral-600">{activeStep.description}</p>}

                            {activeStep.questions?.map((q) => (
                                <div key={q.id} className="space-y-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                                    <p className="font-semibold text-neutral-900">{q.text}</p>
                                    <div className="space-y-2">
                                        {q.options.map((opt) => (
                                            <label
                                                key={opt}
                                                className={clsx(
                                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                    quizAnswers[q.id] === opt
                                                        ? "bg-white border-blue-500 shadow-sm ring-1 ring-blue-500"
                                                        : "bg-white border-neutral-200 hover:border-neutral-300"
                                                )}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`}
                                                    className="w-4 h-4 text-blue-600 border-neutral-300 focus:ring-blue-500"
                                                    checked={quizAnswers[q.id] === opt}
                                                    onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                />
                                                <span className="text-sm text-neutral-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeStep.content?.sections?.map((section, idx) => (
                        <div key={idx} className="space-y-2">
                            <h3 className="text-xl font-bold text-neutral-900">{section.title}</h3>
                            <p className="text-neutral-600 leading-relaxed">{section.body}</p>
                        </div>
                    ))}

                    {activeStep.content?.highlight && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 flex gap-4">
                            <div className="flex-shrink-0 w-1 pt-1">
                                <span className="block w-2 h-2 rounded-full bg-amber-400" />
                            </div>
                            <p className="text-amber-900 font-medium italic">
                                {activeStep.content.highlight}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="relative">
            <div className="space-y-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Chapter</h1>
                    <p className="text-sm text-neutral-500 mt-1">{CHAPTER_DATA.title}</p>
                </div>
                <div className="border-b border-neutral-200" />
            </div>

            {/* MOBILE TOP BAR */}
            <div className="lg:hidden sticky top-0 bg-white border-b border-neutral-200 z-30 px-4 py-3 flex items-center justify-between shadow-sm mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1 -ml-1 text-neutral-500 hover:text-neutral-900">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Chapter 1</div>
                        <div className="text-sm font-bold text-neutral-900 truncate max-w-[150px]">{CHAPTER_DATA.title}</div>
                    </div>
                </div>
                <button
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full text-xs font-bold text-neutral-700 transition-colors"
                >
                    {completedStepIds.length}/{CHAPTER_DATA.stats.totalSteps}
                    <ChevronDown className="w-3 h-3" />
                </button>
            </div>

            {/* MAIN LAYOUT WITH FLUID RESPONSIVE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-8 items-start">

                {/* LEFT PANEL */}
                <div className="hidden lg:block sticky top-6 h-[calc(100vh-theme(spacing.24))] overflow-y-auto pr-2 custom-scrollbar">
                    <StepsList />
                </div>

                {/* RIGHT PANEL */}
                <div className="min-h-[60vh]">
                    {renderContent()}
                </div>
            </div>

            {/* STICKY FOOTER ACTION BAR */}
            {!isChapterCompleted && (
                <div className="fixed bottom-24 lg:bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-neutral-200 z-40 lg:pl-[340px] flex items-center justify-between gap-4 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:shadow-none">
                    <Button
                        variant="secondary"
                        onClick={handlePrev}
                        disabled={activeStepIndex === 0}
                        className="flex-1 lg:flex-none border-neutral-200 !rounded-full whitespace-nowrap"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <ChevronLeft className="w-4 h-4 lg:hidden" />
                            <span className="hidden lg:inline">Previous</span>
                            <span className="lg:hidden">Prev</span>
                        </div>
                    </Button>

                    <div className="hidden sm:block text-xs font-medium text-neutral-400">
                        Step {activeStepIndex + 1} of {CHAPTER_DATA.steps.length}
                    </div>

                    <Button
                        onClick={handleNext}
                        disabled={!canProceed}
                        className="flex-1 lg:flex-none min-w-[100px] shadow-lg shadow-blue-500/20 !rounded-full whitespace-nowrap"
                    >
                        <div className="flex items-center justify-center gap-2">
                            {activeStep.type === "quiz" ? (
                                "Submit Reflection"
                            ) : isLastStep ? (
                                "Finish Chapter"
                            ) : (
                                <>
                                    <span className="lg:hidden">Next</span>
                                    <span className="hidden lg:inline">Mark Complete & Next</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </div>
                    </Button>
                </div>
            )}

            {/* FOOTER SPACER (Mobile Only) */}
            <div className="h-32 lg:h-20" />

            {/* MOBILE DRAWER */}
            {isMobileDrawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setIsMobileDrawerOpen(false)}
                    />
                    <div className="relative bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto p-6 pb-12 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg">Course Progress</h3>
                            <button onClick={() => setIsMobileDrawerOpen(false)} className="p-2 bg-neutral-100 rounded-full">
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>
                        <StepsList />
                    </div>
                </div>
            )}
        </div>
    );
}
