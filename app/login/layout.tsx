export const dynamic = "force-dynamic";

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="theme-login contents">{children}</div>;
}
