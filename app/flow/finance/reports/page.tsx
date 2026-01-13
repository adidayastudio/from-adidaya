
import { getExpenses } from "@/app/flow/finance/actions";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import ReportsClient from "@/components/flow/finance/ReportsClient";

export default async function ReportsPage() {
    const expenses = await getExpenses();

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Reports" }]}
            header={
                <FinanceHeader
                    title="Reports"
                    subtitle="Financial summaries and analytics."
                />
            }
        >
            <ReportsClient expenses={expenses} />
        </FinancePageWrapper>
    );
}
