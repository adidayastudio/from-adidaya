import { createClient } from "@/utils/supabase/client";
import { EmploymentType, WorkStatus, EmploymentPolicy, WorkSchedule, LeavePolicy } from "@/lib/types/organization";

const supabase = createClient();

// --- Employment Types ---

export async function fetchEmploymentTypes(): Promise<EmploymentType[]> {
    const { data, error } = await supabase
        .from("employment_types")
        .select("*")
        .order('order_index', { ascending: true });

    if (error) {
        console.error("Error fetching employment types:", error.message || error, error.code);
        return [];
    }

    return data as EmploymentType[];
}

export async function upsertEmploymentType(type: Partial<EmploymentType>): Promise<EmploymentType | null> {
    // If setting as default, we might want to unset others, but for now just save.
    // The backend logic for single default usually requires a trigger or transaction, 
    // or we handle it here by updating others first.
    if (type.is_default) {
        await supabase
            .from("employment_types")
            .update({ is_default: false })
            .neq("id", type.id || "00000000-0000-0000-0000-000000000000"); // Update all others
    }

    const { data, error } = await supabase
        .from("employment_types")
        .upsert(type)
        .select()
        .maybeSingle();

    if (error) {
        if (error.code === '42501') {
            console.error("Error upserting employment type: 42501 Row Level Security (RLS) violation. Ensure your user has the correct permissions.");
        } else {
            console.error("Error upserting employment type:", error.message || error, error.code);
        }
        return null;
    }

    if (!data && type.id) {
        console.warn("Operation succeeded but no data field returned. Likely RLS restriction.");
        return type as EmploymentType;
    }

    return data as EmploymentType;
}

export async function deleteEmploymentType(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("employment_types")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting employment type:", error.message || error, error.code);
        return false;
    }
    return true;
}

export async function updateEmploymentTypeOrder(items: EmploymentType[]) {
    const updates = items.map((item, index) => ({
        id: item.id,
        order_index: index + 1,
        // include other required fields to satisfy upsert if needed, but partial update is better
        // upsert requires all not-null fields if it's a new row, but for existing rows it's fine.
        // However, Supabase/PostgREST upsert needs the primary key.
        // It's better to use a loop or a specific RPC for reordering, but simple loop works for small lists.
    }));

    for (const update of updates) {
        await supabase.from("employment_types").update({ order_index: update.order_index }).eq("id", update.id);
    }
}

// --- Work Status ---

export async function fetchWorkStatuses(): Promise<WorkStatus[]> {
    const { data, error } = await supabase
        .from("work_status")
        .select("*")
        .order('order_index', { ascending: true });

    if (error) {
        console.error("Error fetching work statuses:", error.message || error, error.code);
        return [];
    }
    return data as WorkStatus[];
}

export async function upsertWorkStatus(status: Partial<WorkStatus>): Promise<WorkStatus | null> {
    const { data, error } = await supabase
        .from("work_status")
        .upsert(status)
        .select()
        .maybeSingle();

    if (error) {
        if (error.code === '42501') {
            console.error("Error upserting work status: 42501 Row Level Security (RLS) violation.");
        } else {
            console.error("Error upserting work status:", error.message || error, error.code);
        }
        return null;
    }

    if (!data && status.id) return status as WorkStatus;
    
    return data as WorkStatus;
}

export async function deleteWorkStatus(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("work_status")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting work status:", error.message || error, error.code);
        return false;
    }
    return true;
}

export async function updateWorkStatusOrder(items: WorkStatus[]) {
    const updates = items.map((item, index) => ({
        id: item.id,
        order_index: index + 1
    }));
    for (const update of updates) {
        await supabase.from("work_status").update({ order_index: update.order_index }).eq("id", update.id);
    }
}

// --- Employment Policies (Linked to Type) ---

export async function fetchEmploymentPolicies(): Promise<EmploymentPolicy[]> {
    const { data, error } = await supabase
        .from("employment_policies")
        .select("*");

    if (error) {
        console.error("Error fetching policies:", error.message || error, error.code);
        return [];
    }
    return data as EmploymentPolicy[];
}

export async function upsertEmploymentPolicy(policy: Partial<EmploymentPolicy>): Promise<EmploymentPolicy | null> {
    const { data, error } = await supabase
        .from("employment_policies")
        .upsert(policy, { onConflict: 'employment_type_id' })
        .select()
        .maybeSingle();

    if (error) {
        if (error.code === '42501') {
            console.error("Error upserting employment policy: 42501 Row Level Security (RLS) violation. Try running the provided SQL script.");
        } else {
            console.error("Error upserting employment policy:", error.message || error, error.code);
        }
        return null;
    }
    
    if (!data && policy.employment_type_id) return policy as EmploymentPolicy;

    return data as EmploymentPolicy;
}

// --- Work Schedules (NEW) ---

export async function fetchWorkSchedules(): Promise<WorkSchedule[]> {
    const { data, error } = await supabase
        .from("work_schedules")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching work schedules:", error.message || error, error.code);
        return [];
    }
    return data as WorkSchedule[];
}

export async function upsertWorkSchedule(schedule: Partial<WorkSchedule>): Promise<WorkSchedule | null> {
    const { data, error } = await supabase
        .from("work_schedules")
        .upsert(schedule)
        .select()
        .maybeSingle();

    if (error) {
        if (error.code === '42501') console.error("Error upserting work schedule: 42501 Row Level Security (RLS) violation.");
        else console.error("Error upserting work schedule:", error.message || error, error.code);
        return null;
    }
    
    if (!data && schedule.id) return schedule as WorkSchedule;
    return data as WorkSchedule;
}

export async function deleteWorkSchedule(id: string): Promise<boolean> {
    // Check usage first? Assuming backend or UI handles "prevent deletion if used"
    const { error } = await supabase
        .from("work_schedules")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting work schedule:", error.message || error, error.code);
        return false;
    }
    return true;
}

// --- Leave Policies (NEW) ---

export async function fetchLeavePolicies(): Promise<LeavePolicy[]> {
    const { data, error } = await supabase
        .from("leave_policies")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching leave policies:", error.message || error, error.code);
        return [];
    }
    return data as LeavePolicy[];
}

export async function upsertLeavePolicy(policy: Partial<LeavePolicy>): Promise<LeavePolicy | null> {
    const { data, error } = await supabase
        .from("leave_policies")
        .upsert(policy)
        .select()
        .maybeSingle();

    if (error) {
        if (error.code === '42501') console.error("Error upserting leave policy: 42501 Row Level Security (RLS) violation.");
        else console.error("Error upserting leave policy:", error.message || error, error.code);
        return null;
    }
    if (!data && policy.id) return policy as LeavePolicy;
    return data as LeavePolicy;
}

export async function deleteLeavePolicy(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("leave_policies")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting leave policy:", error.message || error, error.code);
        return false;
    }
    return true;
}
