
import { getExpenses } from "@/app/flow/finance/actions";
import PaymentList from "@/components/flow/finance/PaymentList";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";

import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";

export default async function PaymentsPage() {
    const expenses = await getExpenses();

    // Filter for Approved only
    const approvedExpenses = expenses.filter(e => e.status === "Approved");

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Payments" }]}
            header={
                <FinanceHeader
                    title="Payments"
                    subtitle="Process payments for approved expenses."
                />
            }
        >
            <div className="space-y-6 animate-in fade-in duration-500">
                <PaymentList expenses={approvedExpenses} />
            </div>
        </FinancePageWrapper>
    );
}
