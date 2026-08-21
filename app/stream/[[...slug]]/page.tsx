"use client";

import { use } from "react";
import StreamPage from "@/components/stream/StreamPage";

interface StreamRouteProps {
    params: Promise<{
        slug?: string[];
    }>;
}

export default function StreamRoute({ params }: StreamRouteProps) {
    const resolvedParams = use(params);
    return <StreamPage params={resolvedParams} />;
}
