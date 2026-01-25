/**
 * Server-side Authentication Utilities
 * 
 * Provides helpers for validating auth in API routes
 */

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export interface AuthenticatedUser {
    id: string;
    email?: string;
    // Add more fields as needed from Supabase auth
}

/**
 * Gets the authenticated user from the current session.
 * Uses cookies to verify the Supabase session server-side.
 */
export async function getAuthenticatedUser(): Promise<{
    user: AuthenticatedUser | null;
    error: string | null
}> {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return { user: null, error: error?.message || "Not authenticated" };
        }

        return {
            user: {
                id: user.id,
                email: user.email
            },
            error: null
        };
    } catch (e) {
        console.error("Auth error:", e);
        return { user: null, error: "Authentication failed" };
    }
}

/**
 * Returns a 401 Unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Returns a 400 Bad Request response
 */
export function badRequestResponse(message = "Bad Request") {
    return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Returns a 404 Not Found response
 */
export function notFoundResponse(message = "Not Found") {
    return NextResponse.json({ error: message }, { status: 404 });
}

/**
 * Returns a 500 Internal Server Error response
 */
export function serverErrorResponse(message = "Internal Server Error") {
    return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Returns a success response with data
 */
export function successResponse<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
}

/**
 * Returns a created response (201)
 */
export function createdResponse<T>(data: T) {
    return NextResponse.json(data, { status: 201 });
}
