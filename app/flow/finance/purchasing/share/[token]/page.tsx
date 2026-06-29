import ShareClient from "./ShareClient";

interface PageProps {
    params: Promise<{ token: string }>;
}

export default async function Page({ params }: PageProps) {
    const resolvedParams = await params;
    return <ShareClient token={resolvedParams.token} />;
}
