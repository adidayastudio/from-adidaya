/**
 * Finance Dashboard API Route
 * 
 * Returns aggregated dashboard data with counts and sums
 * Uses efficient COUNT/SUM queries instead of fetching all rows
 */

import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/server/supabase";
import {
    getAuthenticatedUser,
    unauthorizedResponse,
    serverErrorResponse,
    successResponse
} from "@/lib/server/auth";

/**
 * GET /api/finance/dashboard
 */
export async function GET(request: NextRequest) {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
        return unauthorizedResponse(authError || "Not authenticated");
    }

    try {
        const supabase = await createServerSupabase();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        // Run queries in parallel for performance
        const [
            paidPurchases,
            paidReimburse,
            outstandingBills,
            reimbursePending,
            pettyCash,
            myPurchases,
            myReimburse,
            myPendingPurchases,
            myPendingReimburse,
            myPaidReimburse,
            goodsReceived,
            invoices,
            staffClaims,
            myPurchaseHistory,
            myReimburseHistory,
            recentPurchases,
            recentReimburse
        ] = await Promise.all([
            // Total Paid (Purchasing) this month
            supabase
                .from('purchasing_requests')
                .select('amount')
                .eq('financial_status', 'PAID')
                .gte('payment_date', startOfMonth)
                .lte('payment_date', endOfMonth),

            // Total Paid (Reimburse) this month
            supabase
                .from('reimbursement_requests')
                .select('amount')
                .eq('status', 'PAID')
                .gte('payment_date', startOfMonth)
                .lte('payment_date', endOfMonth),

            // Outstanding Bills count
            supabase
                .from('purchasing_requests')
                .select('id', { count: 'exact', head: true })
                .neq('financial_status', 'PAID')
                .in('purchase_stage', ['INVOICED', 'RECEIVED']),

            // Reimburse Pending count
            supabase
                .from('reimbursement_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'PENDING'),

            // Petty Cash Balance
            supabase
                .from('funding_sources')
                .select('balance')
                .eq('type', 'PETTY_CASH'),

            // My Purchases this month (count)
            supabase
                .from('purchasing_requests')
                .select('id', { count: 'exact', head: true })
                .eq('created_by', user.id)
                .gte('created_at', startOfMonth),

            // My Reimbursements this month (count)
            supabase
                .from('reimbursement_requests')
                .select('id', { count: 'exact', head: true })
                .eq('created_by', user.id)
                .gte('created_at', startOfMonth),

            // My Pending Purchases
            supabase
                .from('purchasing_requests')
                .select('id', { count: 'exact', head: true })
                .eq('created_by', user.id)
                .in('approval_status', ['DRAFT', 'SUBMITTED', 'NEED_REVISION']),

            // My Pending Reimbursements
            supabase
                .from('reimbursement_requests')
                .select('id', { count: 'exact', head: true })
                .eq('created_by', user.id)
                .in('status', ['DRAFT', 'PENDING', 'NEED_REVISION']),

            // Paid to me this month
            supabase
                .from('reimbursement_requests')
                .select('amount')
                .eq('created_by', user.id)
                .eq('status', 'PAID')
                .gte('payment_date', startOfMonth)
                .lte('payment_date', endOfMonth),

            // Goods Received (Unpaid) - limited list
            supabase
                .from('purchasing_requests')
                .select('id, date, vendor, description, amount, project:projects(project_name, project_code)')
                .eq('purchase_stage', 'RECEIVED')
                .neq('financial_status', 'PAID')
                .order('date', { ascending: true })
                .limit(5),

            // Invoices Pending - limited list
            supabase
                .from('purchasing_requests')
                .select('id, date, vendor, description, amount, project:projects(project_name, project_code)')
                .eq('purchase_stage', 'INVOICED')
                .neq('financial_status', 'PAID')
                .order('date', { ascending: true })
                .limit(5),

            // Staff Claims - limited list
            supabase
                .from('reimbursement_requests')
                .select('id, date, description, amount, created_by, project:projects(project_name, project_code)')
                .eq('status', 'PENDING')
                .order('date', { ascending: true })
                .limit(10),

            // My Purchase History - limited
            supabase
                .from('purchasing_requests')
                .select('id, date, vendor, description, amount, approval_status, financial_status, project:projects(project_name, project_code)')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false })
                .limit(5),

            // My Reimburse History - limited
            supabase
                .from('reimbursement_requests')
                .select('id, date, description, amount, status, project:projects(project_name, project_code)')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false })
                .limit(5),

            // Recent Purchases - limited
            supabase
                .from('purchasing_requests')
                .select('id, date, vendor, description, amount, approval_status, updated_at, created_by, project:projects(project_name, project_code)')
                .order('updated_at', { ascending: false })
                .limit(10),

            // Recent Reimbursements - limited
            supabase
                .from('reimbursement_requests')
                .select('id, date, description, amount, status, updated_at, created_by, project:projects(project_name, project_code)')
                .order('updated_at', { ascending: false })
                .limit(10)
        ]);

        // Calculate totals
        const totalPaidPurchasing = paidPurchases.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        const totalPaidReimburse = paidReimburse.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        const pettyCashBalance = pettyCash.data?.reduce((sum, item) => sum + (item.balance || 0), 0) || 0;
        const paidToMe = myPaidReimburse.data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

        // Get user profiles for recent activity
        const userIds = new Set<string>();
        recentPurchases.data?.forEach(p => userIds.add(p.created_by));
        recentReimburse.data?.forEach(r => userIds.add(r.created_by));
        staffClaims.data?.forEach(c => userIds.add(c.created_by));

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', Array.from(userIds));

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Attach profile info to recent activity
        const enrichedRecentPurchases = recentPurchases.data?.map(p => ({
            ...p,
            user: profileMap.get(p.created_by)
        })) || [];

        const enrichedRecentReimburse = recentReimburse.data?.map(r => ({
            ...r,
            user: profileMap.get(r.created_by)
        })) || [];

        const enrichedStaffClaims = staffClaims.data?.map(c => ({
            ...c,
            user: profileMap.get(c.created_by)
        })) || [];

        return successResponse({
            // Team Summary
            team: {
                totalPaidThisMonth: totalPaidPurchasing + totalPaidReimburse,
                totalPaidPurchasing,
                totalPaidReimburse,
                outstandingBills: outstandingBills.count || 0,
                reimbursePending: reimbursePending.count || 0,
                pettyCashBalance
            },
            // Personal Summary
            personal: {
                myPurchases: myPurchases.count || 0,
                myReimburse: myReimburse.count || 0,
                pendingApproval: (myPendingPurchases.count || 0) + (myPendingReimburse.count || 0),
                paidToMe
            },
            // Attention Items (Team)
            attention: {
                goodsReceived: goodsReceived.data || [],
                invoices: invoices.data || [],
                staffClaims: enrichedStaffClaims
            },
            // My History (Personal)
            myHistory: {
                purchases: myPurchaseHistory.data || [],
                reimbursements: myReimburseHistory.data || []
            },
            // Recent Activity (Team)
            recentActivity: {
                purchases: enrichedRecentPurchases,
                reimbursements: enrichedRecentReimburse
            }
        });
    } catch (e) {
        console.error("Dashboard GET error:", e);
        return serverErrorResponse("Internal server error");
    }
}
