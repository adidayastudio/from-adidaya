import { NextRequest, NextResponse } from "next/server";
 
function extractCoordinates(url: string): { lat: string; lng: string } | null {
    const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const atMatch = url.match(atRegex);
    if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };
 
    const qRegex = /[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const qMatch = url.match(qRegex);
    if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };
 
    const searchRegex = /search\/(-?\d+\.\d+),(-?\d+\.\d+)/;
    const searchMatch = url.match(searchRegex);
    if (searchMatch) return { lat: searchMatch[1], lng: searchMatch[2] };
 
    const rawRegex = /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/;
    const rawMatch = url.trim().match(rawRegex);
    if (rawMatch) return { lat: rawMatch[1], lng: rawMatch[2] };
 
    return null;
}
 
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
 
    if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
 
    try {
        // Parse directly first if it's already a full URL
        let coords = extractCoordinates(url);
        if (coords) {
            return NextResponse.json(coords);
        }
 
        // If it's a shortened link, resolve redirects on server-side
        const res = await fetch(url, {
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        
        const finalUrl = res.url;
        coords = extractCoordinates(finalUrl);
        
        if (coords) {
            return NextResponse.json(coords);
        }
 
        return NextResponse.json({ error: "Could not extract coordinates from resolved URL" }, { status: 422 });
    } catch (error: any) {
        console.error("Error resolving maps URL:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
