
import { getExpenses } from "@/app/flow/finance/actions";
import TransactionList from "@/components/flow/finance/TransactionList";
import AddTransactionModal from "@/components/flow/finance/AddTransactionModal";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import { createClient } from "@/utils/supabase/server";

import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";

export default async function TransactionsPage() {
    const expenses = await getExpenses();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Transactions" }]}
            header={
                <FinanceHeader
                    title="Transactions"
                    subtitle="View and manage all financial transactions."
                />
            }
        >
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    {/* Placeholder for filters */}
                    <div />
                    <AddTransactionModal />
                </div>

                <TransactionList expenses={expenses} userId={user?.id || null} />
            </div>
        </FinancePageWrapper>
    );
}
