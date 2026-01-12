export const dynamic = "force-dynamic";

export default function FeelLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="theme-feel contents">{children}</div>;
}
