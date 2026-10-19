import React, { useId, useState } from 'react';
import { Platform } from 'react-native';

/** Immediate hover/focus tooltip in a portal, so scroll panes cannot clip it. */
export function InstantTooltip({ label, children }: { label: string; children: React.ReactNode }) {
    const id = useId();
    const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);
    if (Platform.OS !== 'web') return <>{children}</>;
    const show = (event: React.MouseEvent<HTMLSpanElement> | React.FocusEvent<HTMLSpanElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setAnchor({ left: Math.max(120, Math.min(window.innerWidth - 120, rect.left + rect.width / 2)), top: rect.bottom + 7 });
    };
    // Loaded only on web; native keeps its standard accessible controls.
    const { createPortal } = require('react-dom');
    return <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }} onMouseEnter={show} onMouseLeave={() => setAnchor(null)} onFocus={show} onBlur={() => setAnchor(null)} onPointerDown={() => setAnchor(null)} aria-describedby={anchor ? id : undefined}>
        {children}
        {anchor && createPortal(<span id={id} role="tooltip" style={{ position: 'fixed', left: anchor.left, top: anchor.top, transform: 'translateX(-50%)', zIndex: 2147483647, pointerEvents: 'none', maxWidth: 240, padding: '7px 10px', borderRadius: 8, background: '#303034', color: '#FFFFFF', fontFamily: 'system-ui, sans-serif', fontSize: 12, lineHeight: '16px', boxShadow: '0 3px 12px rgba(0,0,0,.25)' }}>{label}</span>, document.body)}
    </span>;
}
