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
        const searchParams = request.nextUrl.searchParams;
        const workspaceId = searchParams.get("workspace_id");

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Use YYYY-MM-DD to avoid UTC shifts from .toISOString()
        const startOfThisMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDayThisMonth = new Date(year, month, 0).getDate();
        const endOfThisMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDayThisMonth).padStart(2, '0')}`;

        const lastMonthDate = new Date(year, month - 2, 1);
        const lastMonthYear = lastMonthDate.getFullYear();
        const lastMonthNum = lastMonthDate.getMonth() + 1;
        const startOfLastMonth = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}-01`;
        const lastDayLastMonth = new Date(lastMonthYear, lastMonthNum, 0).getDate();
        const endOfLastMonth = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}-${String(lastDayLastMonth).padStart(2, '0')}`;

        // Get project IDs for this workspace to filter requests
        let workspaceProjectIds: string[] = [];
        if (workspaceId) {
            const { data: projects } = await supabase.from('projects').select('id').eq('workspace_id', workspaceId);
            workspaceProjectIds = projects?.map(p => p.id) || [];
        }

        // Base queries with optional project filtering
        const purchasingBase = supabase.from('purchasing_requests');
        const reimburseBase = supabase.from('reimbursement_requests');

        const applyProjectFilter = (query: any) => {
            if (workspaceId && workspaceProjectIds.length > 0) {
                return query.in('project_id', workspaceProjectIds);
            }
            return query;
        };

        // Run queries in parallel for performance
        const [
            teamPaidPurchasesThisMonth,
            teamPaidReimburseThisMonth,
            teamPaidPurchasesLastMonth,
            teamPaidReimburseLastMonth,
            outstandingBills,
            reimbursePending,
            fundingSourcesRes,
            myPaidPurchases,
            myPaidReimburse,
            myPendingPurchases,
            myPendingReimburse,
            goodsReceived,
            invoices,
            staffClaims,
            myPurchaseHistory,
            myReimburseHistory
        ] = await Promise.all([
            // Team Paid Purchasing (This Month)
            applyProjectFilter(supabase.from('purchasing_requests').select('amount').eq('financial_status', 'PAID').gte('payment_date', startOfThisMonth).lte('payment_date', endOfThisMonth)),
            // Team Paid Reimburse (This Month)
            applyProjectFilter(supabase.from('reimbursement_requests').select('amount').eq('status', 'PAID').gte('payment_date', startOfThisMonth).lte('payment_date', endOfThisMonth)),

            // Team Paid Purchasing (Last Month)
            applyProjectFilter(supabase.from('purchasing_requests').select('amount').eq('financial_status', 'PAID').gte('payment_date', startOfLastMonth).lte('payment_date', endOfLastMonth)),
            // Team Paid Reimburse (Last Month)
            applyProjectFilter(supabase.from('reimbursement_requests').select('amount').eq('status', 'PAID').gte('payment_date', startOfLastMonth).lte('payment_date', endOfLastMonth)),

            // Outstanding Bills: All non-PAID and VALID purchases
            applyProjectFilter(supabase.from('purchasing_requests').select('amount')
                .neq('financial_status', 'PAID')
                .not('approval_status', 'in', '("REJECTED","DRAFT","CANCELLED")')),

            // Reimburse Pending: ONLY APPROVED reimbursements awaiting payment (as requested: "harusnya 1043")
            applyProjectFilter(supabase.from('reimbursement_requests').select('amount')
                .eq('status', 'APPROVED')),

            // Funding Sources: All active accounts in workspace
            workspaceId
                ? supabase.from('funding_sources').select('balance, type').eq('workspace_id', workspaceId)
                : supabase.from('funding_sources').select('balance, type'),

            // Personal Paid Purchases (This Month)
            supabase.from('purchasing_requests')
                .select('amount', { count: 'exact' })
                .eq('created_by', user.id)
                .eq('financial_status', 'PAID')
                .gte('date', startOfThisMonth)
                .lte('date', endOfThisMonth),

            // Personal Paid Reimburse (This Month)
            supabase.from('reimbursement_requests')
                .select('amount', { count: 'exact' })
                .eq('created_by', user.id)
                .eq('status', 'PAID')
                .gte('date', startOfThisMonth)
                .lte('date', endOfThisMonth),

            // Personal Pending Purchases (This Month)
            supabase.from('purchasing_requests')
                .select('amount', { count: 'exact' })
                .eq('created_by', user.id)
                .not('approval_status', 'in', '("REJECTED","DRAFT","CANCELLED")')
                .neq('financial_status', 'PAID')
                .gte('date', startOfThisMonth)
                .lte('date', endOfThisMonth),

            // Personal Pending Reimburse (This Month)
            supabase.from('reimbursement_requests')
                .select('amount', { count: 'exact' })
                .eq('created_by', user.id)
                .not('status', 'in', '("PAID","REJECTED","DRAFT","CANCELLED")')
                .gte('date', startOfThisMonth)
                .lte('date', endOfThisMonth),

            // TEAM - Goods Received (Unpaid) - 5 most recent by date
            applyProjectFilter(supabase.from('purchasing_requests')
                .select('id, date, vendor, description, amount, project:projects(project_name, project_code)')
                .eq('purchase_stage', 'RECEIVED')
                .neq('financial_status', 'PAID')
                .order('date', { ascending: false })
                .limit(5)),

            // TEAM - Invoices Pending - 5 most recent by date
            applyProjectFilter(supabase.from('purchasing_requests')
                .select('id, date, vendor, description, amount, project:projects(project_name, project_code)')
                .eq('purchase_stage', 'INVOICED')
                .neq('financial_status', 'PAID')
                .order('date', { ascending: false })
                .limit(5)),

            // TEAM - Staff Claims (Reimburse Pending) - 5 most recent by date
            applyProjectFilter(supabase.from('reimbursement_requests')
                .select('id, date, description, amount, created_by, project:projects(project_name, project_code)')
                .eq('status', 'PENDING')
                .order('date', { ascending: false })
                .limit(5)),

            // PERSONAL - My Purchase History (THIS MONTH) - 5 most recent by date
            supabase.from('purchasing_requests')
                .select('id, date, vendor, description, amount, approval_status, financial_status, purchase_stage, created_at, updated_at, project_id, project:projects(project_name, project_code)')
                .eq('created_by', user.id)
                .gte('date', startOfThisMonth)
                .lte('date', endOfThisMonth)
                .order('date', { ascending: false })
                .limit(5),

            // PERSONAL - My Reimburse History (THIS MONTH) - 5 most recent by date
            supabase.from('reimbursement_requests')
                .select('id, date, description, amount, status, category, created_at, updated_at, project_id, project:projects(project_name, project_code)')
                .eq('created_by', user.id)
                .gte('date', startOfThisMonth)
                .lte('date', endOfThisMonth)
                .order('date', { ascending: false })
                .limit(5)
        ]);

        // Check for errors in any of the queries
        const queries = [
            { name: 'teamPaidPurchasesThisMonth', res: teamPaidPurchasesThisMonth },
            { name: 'teamPaidReimburseThisMonth', res: teamPaidReimburseThisMonth },
            { name: 'teamPaidPurchasesLastMonth', res: teamPaidPurchasesLastMonth },
            { name: 'teamPaidReimburseLastMonth', res: teamPaidReimburseLastMonth },
            { name: 'outstandingBills', res: outstandingBills },
            { name: 'reimbursePending', res: reimbursePending },
            { name: 'fundingSources', res: fundingSourcesRes },
            { name: 'myPaidPurchases', res: myPaidPurchases },
            { name: 'myPaidReimburse', res: myPaidReimburse },
            { name: 'myPendingPurchases', res: myPendingPurchases },
            { name: 'myPendingReimburse', res: myPendingReimburse },
            { name: 'goodsReceived', res: goodsReceived },
            { name: 'invoices', res: invoices },
            { name: 'staffClaims', res: staffClaims },
            { name: 'myPurchaseHistory', res: myPurchaseHistory },
            { name: 'myReimburseHistory', res: myReimburseHistory }
        ];

        const failedQuery = queries.find(q => q.res.error);
        if (failedQuery) {
            console.error(`Dashboard query failed: ${failedQuery.name}`, failedQuery.res.error);
            return serverErrorResponse(`Data fetch error: ${failedQuery.name}`);
        }

        // CALCULATIONS - TEAM
        const paidThisMonth =
            (teamPaidPurchasesThisMonth.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0) +
            (teamPaidReimburseThisMonth.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0);

        const paidLastMonth =
            (teamPaidPurchasesLastMonth.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0) +
            (teamPaidReimburseLastMonth.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0);

        const trendPercent = paidLastMonth === 0 ? 0 : Math.round(((paidThisMonth - paidLastMonth) / paidLastMonth) * 100);

        const totalBalance = fundingSourcesRes.data?.reduce((sum: number, item: any) => sum + (item.balance || 0), 0) || 0;
        const totalAccounts = fundingSourcesRes.data?.length || 0;

        const outstandingCount = outstandingBills.data?.length || 0;
        const outstandingAmount = outstandingBills.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;

        const reimbursePendingCount = reimbursePending.data?.length || 0;
        const reimbursePendingAmount = reimbursePending.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;

        // CALCULATIONS - PERSONAL
        const myPaidPurchasesCount = myPaidPurchases.count || 0;
        const myPaidPurchasesAmount = myPaidPurchases.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;

        const myPaidReimburseCount = myPaidReimburse.count || 0;
        const myPaidReimburseAmount = myPaidReimburse.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;

        const myPendingPurchasesCount = myPendingPurchases.count || 0;
        const myPendingPurchasesAmount = myPendingPurchases.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;

        const myPendingReimburseCount = myPendingReimburse.count || 0;
        const myPendingReimburseAmount = myPendingReimburse.data?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;

        // ENRICH STAFF CLAIMS WITH PROFILES
        const staffUserIds = staffClaims.data?.map((c: any) => c.created_by) || [];
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', staffUserIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedStaffClaims = staffClaims.data?.map((c: any) => ({
            ...c,
            staff_name: profileMap.get(c.created_by)?.full_name || 'Staff'
        })) || [];

        return successResponse({
            summary: {
                team: {
                    totalPaid: paidThisMonth,
                    trend: trendPercent,
                    outstanding: { count: outstandingCount, amount: outstandingAmount },
                    reimbursePending: { count: reimbursePendingCount, amount: reimbursePendingAmount },
                    balance: { total: totalBalance, accounts: totalAccounts }
                },
                personal: {
                    purchases: { count: myPaidPurchasesCount, amount: myPaidPurchasesAmount },
                    reimburse: { count: myPaidReimburseCount, amount: myPaidReimburseAmount },
                    pendingPurchases: { count: myPendingPurchasesCount, amount: myPendingPurchasesAmount },
                    pendingReimburse: { count: myPendingReimburseCount, amount: myPendingReimburseAmount }
                }
            },
            lists: {
                goodsReceived: goodsReceived.data || [],
                invoices: invoices.data || [],
                staffClaims: enrichedStaffClaims,
                myPurchaseHistory: myPurchaseHistory.data || [],
                myReimburseHistory: myReimburseHistory.data || []
            }
        });
    } catch (e) {
        console.error("Dashboard GET error:", e);
        return serverErrorResponse("Internal server error");
    }
}

