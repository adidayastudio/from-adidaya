
import { createClient } from "@/utils/supabase/server";
import { getExpenses } from "./actions";
import FinanceOverviewClient from "@/components/flow/finance/FinanceOverviewClient";

export default async function FinanceOverviewPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const expenses = await getExpenses();

    return <FinanceOverviewClient expenses={expenses} userId={user?.id || null} />;
}
