/**
 * Client-side API Helper
 * 
 * Centralized fetch wrapper for making API calls to internal routes.
 * Handles JSON serialization, error handling, and consistent response format.
 */

export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
}

/**
 * Makes a GET request to an internal API route
 */
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
    try {
        const res = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { data: null, error: errorData.error || `Request failed: ${res.status}` };
        }

        const data = await res.json();
        return { data, error: null };
    } catch (e) {
        console.error("API GET Error:", e);
        return { data: null, error: "Network error" };
    }
}

/**
 * Makes a POST request to an internal API route
 */
export async function apiPost<T, B = unknown>(url: string, body: B): Promise<ApiResponse<T>> {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { data: null, error: errorData.error || `Request failed: ${res.status}` };
        }

        const data = await res.json();
        return { data, error: null };
    } catch (e) {
        console.error("API POST Error:", e);
        return { data: null, error: "Network error" };
    }
}

/**
 * Makes a PUT request to an internal API route
 */
export async function apiPut<T, B = unknown>(url: string, body: B): Promise<ApiResponse<T>> {
    try {
        const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { data: null, error: errorData.error || `Request failed: ${res.status}` };
        }

        const data = await res.json();
        return { data, error: null };
    } catch (e) {
        console.error("API PUT Error:", e);
        return { data: null, error: "Network error" };
    }
}

/**
 * Makes a PATCH request to an internal API route
 */
export async function apiPatch<T, B = unknown>(url: string, body: B): Promise<ApiResponse<T>> {
    try {
        const res = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { data: null, error: errorData.error || `Request failed: ${res.status}` };
        }

        const data = await res.json();
        return { data, error: null };
    } catch (e) {
        console.error("API PATCH Error:", e);
        return { data: null, error: "Network error" };
    }
}

/**
 * Makes a DELETE request to an internal API route
 */
export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
    try {
        const res = await fetch(url, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { data: null, error: errorData.error || `Request failed: ${res.status}` };
        }

        // DELETE may return empty body
        const text = await res.text();
        const data = text ? JSON.parse(text) : { success: true };
        return { data, error: null };
    } catch (e) {
        console.error("API DELETE Error:", e);
        return { data: null, error: "Network error" };
    }
}
