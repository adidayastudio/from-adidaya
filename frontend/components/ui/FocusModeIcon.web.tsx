import React from 'react';
import { Focus, Minimize } from 'lucide-react';
export function FocusModeIcon({ active, color, size = 17 }: { active: boolean; color: string; size?: number }) {
    const Icon = active ? Minimize : Focus;
    return <Icon size={size} color={color} strokeWidth={2} aria-hidden="true" />;
}
