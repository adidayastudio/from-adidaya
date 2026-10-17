"use client";

import { Construction } from "lucide-react";

interface FlowPagePlaceholderProps {
    title: string;
    description?: string;
}

export default function FlowPagePlaceholder({ title, description }: FlowPagePlaceholderProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
            <div className="text-center max-w-md">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
                    <Construction className="w-8 h-8 text-neutral-400" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 mb-2">{title}</h1>
                {description && (
                    <p className="text-neutral-500">{description}</p>
                )}
                <p className="text-sm text-neutral-400 mt-4">This feature is under development.</p>
            </div>
        </div>
    );
}
