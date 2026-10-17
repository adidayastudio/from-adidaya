import { NextResponse } from "next/server";
import { identifyAndMergeDuplicates } from "@/lib/api/resource-merger";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        const result = await identifyAndMergeDuplicates();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Merge API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
