import { NextResponse } from "next/server";
import { syncFinanceToResources } from "@/lib/api/resource-sync";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const startDate = body.startDate;

        const result = await syncFinanceToResources(startDate);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Sync Route Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
