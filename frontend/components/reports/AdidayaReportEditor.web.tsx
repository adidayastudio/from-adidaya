import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '@/context/ThemeContext';
import Editor from '@/report-editor/Editor';
import { ReportEditorContext } from '@/report-editor/navigation';
export interface Props { reportId?: string; reportType: string; exportPdf?: boolean; onClose: () => void; onSaved: () => void }
export default function AdidayaReportEditor({ reportId, reportType, exportPdf, onClose, onSaved }: Props) {
    const chrome = useRef<HTMLDivElement>(null);
    const [chromeHeight, setChromeHeight] = useState(150);
    const host = useRef<HTMLDivElement>(null);
    const [root, setRoot] = useState<ShadowRoot | null>(null);
    const { resolvedTheme } = useTheme();
    useLayoutEffect(() => { if (host.current) setRoot(host.current.shadowRoot || host.current.attachShadow({ mode: 'open' })); }, []);
    useLayoutEffect(() => { if (!chrome.current) return; const observer = new ResizeObserver(entries => { setChromeHeight(entries[0].contentRect.height); }); observer.observe(chrome.current); return () => observer.disconnect(); }, []);
    const context = useMemo(() => ({
        chromeTarget: chrome.current,
        params: new URLSearchParams({ type: reportType, ...(reportId ? { id: reportId } : {}), ...(exportPdf ? { export: 'true' } : {}) }),
        onClose: () => { if (window.confirm('Tutup editor? Perubahan yang belum disimpan akan hilang.')) onClose(); },
        onSaved,
    }), [reportId, reportType, exportPdf, onClose, onSaved, root]);
    return <div style={{ flex: 1, height: '100%', minWidth: 0, overflow: 'hidden', position: 'relative' }}><div ref={chrome} style={{ position: 'absolute', top: 0, left: 0, width: 360, zIndex: 2 }} /><div ref={host} style={{ height: '100%', '--report-header-height': `${chromeHeight}px` } as React.CSSProperties}>
        {root && createPortal(<ReportEditorContext.Provider value={context}><link rel="stylesheet" href="/report-editor/editor.css" /><div className={resolvedTheme === 'dark' ? 'editor-theme dark' : 'editor-theme'}><div className="editor-mount"><Editor /><Toaster /></div></div></ReportEditorContext.Provider>, root)}
    </div></div>;
}
