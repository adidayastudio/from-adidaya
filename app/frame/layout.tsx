export default function FrameLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="theme-frame contents" style={{
            // @ts-ignore
            "--action-primary": "#ea580c", // orange-600
            "--action-primary-hover": "#c2410c", // orange-700
            "--action-primary-pressed": "#9a3412", // orange-800
            "--brand-red": "#ea580c", // fallback for direct usages
        } as React.CSSProperties}>
            {children}
        </div>
    );
}
