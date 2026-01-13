
import { getExpenses } from "@/app/flow/finance/actions";
import ApprovalList from "@/components/flow/finance/ApprovalList";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import { createClient } from "@/utils/supabase/server";

import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";

export default async function ApprovalsPage() {
    const expenses = await getExpenses();

    // Filter for Pending only
    const pendingExpenses = expenses.filter(e => e.status === "Pending");

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Approvals" }]}
            header={
                <FinanceHeader
                    title="Approvals"
                    subtitle="Review and approve pending expenses."
                />
            }
        >
            <div className="space-y-6 animate-in fade-in duration-500">
                <ApprovalList expenses={pendingExpenses} />
            </div>
        </FinancePageWrapper>
    );
}
