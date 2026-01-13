"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type Expense = {
    id: string;
    project_id: string | null;
    user_id: string | null;
    description: string;
    amount: number;
    date: string;
    category: string | null;
    status: "Draft" | "Pending" | "Approved" | "Rejected" | "Paid";
    receipt_url: string | null;
    created_at: string;
};

export type ExpenseSummary = {
    totalExpense: number;
    pendingApproval: number;
    paidAmount: number;
    pendingCount: number;
};

export async function getExpenses() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("project_expenses")
        .select(`*`)
        .order("date", { ascending: false });

    if (error) {
        console.error("Error fetching expenses:", JSON.stringify(error, null, 2));
        return [];
    }

    // [DEBUG] INJECT MOCK DATA IF EMPTY
    if (!data || data.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || "mock-user-id";

        return [
            {
                id: "mock-1",
                project_id: null,
                user_id: userId,
                description: "Team Lunch at Sederhana",
                amount: 450000,
                date: new Date().toISOString(),
                category: "Food & Beverage",
                status: "Pending",
                receipt_url: null,
                created_at: new Date().toISOString(),
            },
            {
                id: "mock-2",
                project_id: null,
                user_id: userId,
                description: "Grab to Client Meeting",
                amount: 85000,
                date: new Date(Date.now() - 86400000).toISOString(), // yesterday
                category: "Transport",
                status: "Pending",
                receipt_url: null,
                created_at: new Date().toISOString(),
            },
            {
                id: "mock-3",
                project_id: null,
                user_id: "other-user", // For Team view testing
                description: "Printer Paper & Ink",
                amount: 1200000,
                date: new Date(Date.now() - 172800000).toISOString(),
                category: "Office Supplies",
                status: "Approved",
                receipt_url: null,
                created_at: new Date().toISOString(),
            },
            {
                id: "mock-4",
                project_id: null,
                user_id: userId,
                description: "Project Site Hosting",
                amount: 1500000,
                date: new Date(Date.now() - 250000000).toISOString(),
                category: "Software",
                status: "Paid",
                receipt_url: null,
                created_at: new Date().toISOString(),
            },
            {
                id: "mock-5",
                project_id: null,
                user_id: userId,
                description: "Unauthorized Purchase",
                amount: 5000000,
                date: new Date(Date.now() - 300000000).toISOString(),
                category: "Other",
                status: "Rejected",
                receipt_url: null,
                created_at: new Date().toISOString(),
            }
        ] as Expense[];
    }

    return data;
}

export async function createExpense(prevState: any, formData: FormData) {
    const supabase = await createClient();

    const description = formData.get("description") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const date = formData.get("date") as string;
    const category = formData.get("category") as string;
    // const projectId = formData.get("project_id") as string || null; // Optional for now

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const { error } = await supabase.from("project_expenses").insert({
        description,
        amount,
        date,
        category,
        // project_id: projectId,
        user_id: user.id,
        status: "Pending",
    });

    if (error) {
        console.error("Error creating expense:", error);
        return { error: error.message };
    }

    revalidatePath("/flow/expense");
    revalidatePath("/flow/expense/list");
    return { success: true };
}

export async function getExpenseSummary(): Promise<ExpenseSummary> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("project_expenses")
        .select("amount, status");

    if (error || !data) {
        return {
            totalExpense: 0,
            pendingApproval: 0,
            paidAmount: 0,
            pendingCount: 0,
        };
    }

    const summary = data.reduce(
        (acc, curr) => {
            const amount = Number(curr.amount) || 0;
            acc.totalExpense += amount;

            if (curr.status === "Pending") {
                acc.pendingApproval += amount;
                acc.pendingCount += 1;
            } else if (curr.status === "Paid") {
                acc.paidAmount += amount;
            }

            return acc;
        },
        {
            totalExpense: 0,
            pendingApproval: 0,
            paidAmount: 0,
            pendingCount: 0,
        }
    );

    return summary;
}

export async function updateExpenseStatus(id: string, status: Expense["status"]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Role check logic could go here (e.g. only Admin/Finance can approve)
    // For now assuming RLS handles basic checks or anyone authenticated can update for prototype
    // Ideally we check if user has 'admin' or 'finance' role.

    // Check if user role is authorized from DB or Claims (skipping complex role check as RLS should be primary gatekeeper)
    // Migration 056 allows 'admin', 'finance', 'supervisor' to update.

    const { error } = await supabase
        .from("project_expenses")
        .update({ status })
        .eq("id", id);

    if (error) {
        console.error("Error updating expense:", error);
        return { error: error.message };
    }

    revalidatePath("/flow/finance");
    revalidatePath("/flow/finance/transactions");
    revalidatePath("/flow/finance/approvals");
    revalidatePath("/flow/finance/payments");
    return { success: true };
}
