import clsx from "clsx";

export type ResourceStatus =
    | "RECEIVED" | "IN_USE" | "CONSUMED" // Material
    | "AVAILABLE" | "MOVED" | "DAMAGED" // Tool
    | "ACTIVE" | "MAINTENANCE" | "INACTIVE"; // Asset

export function ResourceStatusBadge({ status }: { status: ResourceStatus | string }) {
    const styles: Record<string, string> = {
        // POSITIVE / START
        RECEIVED: "bg-green-50 text-green-700 border-green-200",
        AVAILABLE: "bg-green-50 text-green-700 border-green-200",
        ACTIVE: "bg-green-50 text-green-700 border-green-200",

        // IN PROGRESS / TRANSIT
        IN_USE: "bg-blue-50 text-blue-700 border-blue-200",
        MOVED: "bg-purple-50 text-purple-700 border-purple-200",

        // WARNING / STOP
        MAINTENANCE: "bg-orange-50 text-orange-700 border-orange-200",

        // END STATE
        CONSUMED: "bg-neutral-100 text-neutral-600 border-neutral-200",
        INACTIVE: "bg-neutral-100 text-neutral-600 border-neutral-200",
        DAMAGED: "bg-red-50 text-red-700 border-red-200",
    };

    const style = styles[status] || "bg-gray-50 text-gray-700 border-gray-200";

    return (
        <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium border", style)}>
            {status.replace(/_/g, " ")}
        </span>
    );
}
