
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { DollarSign, CheckCircle2, Wallet, ShoppingCart } from "lucide-react";
import { RecentActivity } from "@/lib/types/finance-types";

function ActivityItem({ activity }: { activity: RecentActivity }) {
    const router = useRouter();

    const handleClick = () => {
        switch (activity.action) {
            case "Payment":
                router.push('/flow/finance/reports');
                break;
            case "Approval":
                router.push('/flow/finance/reimburse?view=team');
                break;
            case "Purchase":
                router.push('/flow/finance/purchasing?view=team');
                break;
            case "Top Up":
                router.push('/flow/finance/reports');
                break;
            default:
                break;
        }
    };

    return (
        <div
            onClick={handleClick}
            className="group relative flex items-start gap-4 p-2 -mx-2 rounded-xl transition-all duration-300 border border-transparent cursor-pointer hover:bg-white/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-white/50 hover:backdrop-blur-sm"
        >
            <div className={clsx(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                activity.action === "Payment" && "bg-green-50 text-green-600 group-hover:bg-green-100",
                activity.action === "Approval" && "bg-red-50 text-red-600 group-hover:bg-red-100",
                activity.action === "Top Up" && "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
                activity.action === "Purchase" && "bg-orange-50 text-orange-600 group-hover:bg-orange-100"
            )}>
                {activity.action === "Payment" && <DollarSign className="w-5 h-5" />}
                {activity.action === "Approval" && <CheckCircle2 className="w-5 h-5" />}
                {activity.action === "Top Up" && <Wallet className="w-5 h-5" />}
                {activity.action === "Purchase" && <ShoppingCart className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0 py-0.5">
                <p className="text-sm font-medium text-neutral-900 group-hover:text-red-600 transition-colors truncate">{activity.description}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-neutral-500 font-medium bg-neutral-100 px-1.5 py-0.5 rounded">{activity.user}</span>
                    <span className="text-xs text-neutral-400">•</span>
                    <span className="text-xs text-neutral-400">
                        {new Date(activity.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                </div>
            </div>
        </div>
    );
}

export function RecentActivityList({ activities }: { activities: RecentActivity[] }) {
    return (
        <div className="space-y-1">
            {activities.slice(0, 5).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
            ))}
        </div>
    );
}
