"use client";

import React from "react";
import {
    Globe,
    FolderKanban,
    Banknote,
} from "lucide-react";

import StreamInput from "./StreamInput";
import StreamClassifierBubble from "./StreamClassifierBubble";
import { PromptOption } from "./stream-nav-helpers";

import type {
    StreamMessage,
    StreamIntentType,
} from "@/lib/stream/types";

interface AskAdidayaViewProps {
    messages: StreamMessage[];
    isProcessing: boolean;
    chatContainerRef: React.RefObject<HTMLDivElement | null>;
    chatEndRef: React.RefObject<HTMLDivElement | null>;
    onSend: (text: string, quickType?: StreamIntentType) => void;
    onConfirm: (messageId: string) => void;
    onDismiss: (messageId: string) => void;
}

export default function AskAdidayaView({
    messages,
    isProcessing,
    chatContainerRef,
    chatEndRef,
    onSend,
    onConfirm,
    onDismiss,
}: AskAdidayaViewProps) {
    return (
        <>
            {messages.length === 0 ? (
                <div className="flex-1 h-full overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 scrollbar-hide">
                    <div className="w-full max-w-2xl text-center space-y-6">
                        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            What&apos;s on your mind today?
                        </h1>

                        <div className="px-1">
                            <StreamInput onSend={onSend} isProcessing={isProcessing} placeholder="Work on anything..." />
                        </div>

                        <div className="space-y-2.5 pt-2 text-left max-w-xl mx-auto">
                            <PromptOption
                                icon={<Globe className="w-4 h-4 text-blue-500" />}
                                title="Summarize progress, risks, decisions across active projects"
                                onClick={() => onSend("Summarize progress, risks, decisions across active projects")}
                            />
                            <PromptOption
                                icon={<FolderKanban className="w-4 h-4 text-emerald-500" />}
                                title="Bikin proyek baru Precision Gym Jakarta BSD"
                                onClick={() => onSend("bikin proyek baru Precision Gym Jakarta BSD")}
                            />
                            <PromptOption
                                icon={<Banknote className="w-4 h-4 text-amber-500" />}
                                title="Beli semen 50 sak 2.5jt untuk proyek Kemang"
                                onClick={() => onSend("beli semen 50 sak 2.5jt proyek Kemang")}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    ref={chatContainerRef}
                    className="flex-1 h-full overflow-y-auto px-4 sm:px-8 py-6 scrollbar-hide"
                >
                    <div className="max-w-3xl mx-auto space-y-6">
                        {messages.map((msg, idx) => {
                            if (msg.role === "system" && !msg.isProcessing) return null;
                            const nextMsg = msg.role === "user" ? messages[idx + 1] : null;

                            return (
                                <StreamClassifierBubble
                                    key={msg.id}
                                    userMessage={msg.content}
                                    classification={nextMsg?.classification || null}
                                    isProcessing={nextMsg?.isProcessing}
                                    isConfirmed={nextMsg?.status === "saved"}
                                    isDismissed={nextMsg?.status === "dismissed"}
                                    onConfirm={() => nextMsg && onConfirm(nextMsg.id)}
                                    onDismiss={() => nextMsg && onDismiss(nextMsg.id)}
                                />
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>
                </div>
            )}

            {messages.length > 0 && (
                <div className="shrink-0 p-3 sm:p-4 bg-transparent">
                    <StreamInput onSend={onSend} isProcessing={isProcessing} placeholder="Work on anything..." />
                    <div className="text-center pt-2 text-[10px] text-neutral-400">
                        ChatGPT &amp; Adidaya Stream can make mistakes. Verify important operational data.
                    </div>
                </div>
            )}
        </>
    );
}
