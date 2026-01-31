import { createClient } from "@/utils/supabase/client";
import { OrganizationDepartment, OrganizationLevel, OrganizationPosition, OrganizationSystemRole } from "../types/organization";

const supabase = createClient();

// -- DEPARTMENTS --

export async function fetchDepartments(): Promise<OrganizationDepartment[]> {
    const { data, error } = await supabase
        .from('organization_departments')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching departments:', error);
        return [];
    }
    return data || [];
}

export async function upsertDepartment(department: Partial<OrganizationDepartment>): Promise<OrganizationDepartment | null> {
    const code = department.code || "";
    // Extract cluster_code (e.g. "1-AID" -> 1)
    const clusterCode = parseInt(code.split('-')[0]) || 0;

    const payload: any = {
        name: department.name,
        code: code,
        cluster_code: clusterCode,
        status: department.status
    };

    // Crucial: if we have an ID, we MUST include it in the payload for upsert to work as an update
    if (department.id) {
        payload.id = department.id;
    }

    if (department.order_index !== undefined) {
        payload.order_index = department.order_index;
    }

    console.log("Saving department (upsert):", { id: department.id, cluster_code: clusterCode, payload });

    const { data, error } = await supabase
        .from('organization_departments')
        .upsert(payload, { onConflict: 'id' }) // Explicitly match on ID
        .select()
        .maybeSingle(); // Use maybeSingle to prevent PGRST116 if RLS blocks the return

    if (error) {
        console.error('API Error: Error saving department:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            payload
        });
        return null;
    }

    if (!data && department.id) {
        console.warn("Operation succeeded but no data returned. This usually means RLS is blocking the SELECT permission.");
        // We can't return null here or the UI will think it failed.
        return department as OrganizationDepartment;
    }

    return data;
}

export async function deleteDepartment(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('organization_departments')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting department:', error);
        return false;
    }
    return true;
}

// -- POSITIONS --

export async function fetchPositions(departmentId?: string): Promise<OrganizationPosition[]> {
    let query = supabase
        .from('organization_positions')
        .select(`
            *,
            organization_departments (
                name,
                code
            )
        `)
        .order('code', { ascending: true });

    if (departmentId) {
        query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching positions:', error);
        return [];
    }

    return (data || []).map((pos: any) => ({
        ...pos,
        department_name: pos.organization_departments?.name,
        department_abbr: pos.organization_departments?.code?.split('-')[1],
        department_full_code: pos.organization_departments?.code
    }));
}

export async function upsertPosition(position: Partial<OrganizationPosition>): Promise<OrganizationPosition | null> {
    const payload: any = {
        code: position.code,
        name: position.name,
        department_id: position.department_id,
        category_code: position.category_code,
        status: position.status
    };

    if (position.id) {
        payload.id = position.id;
    }

    console.log("Saving position (upsert):", { id: position.id, payload });

    const { data, error } = await supabase
        .from('organization_positions')
        .upsert(payload, { onConflict: 'id' })
        .select(`
            *,
            organization_departments (
                name,
                code
            )
        `)
        .maybeSingle();

    if (error) {
        console.error('API Error: Error saving position:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            payload
        });
        return null;
    }

    if (!data && position.id) {
        console.warn("Operation succeeded but no data field returned. Likely RLS restriction.");
        return position as OrganizationPosition;
    }

    return data ? {
        ...data,
        department_name: data.organization_departments?.name,
        department_abbr: data.organization_departments?.code?.split('-')[1],
        department_full_code: data.organization_departments?.code
    } : null;
}

export async function deletePosition(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('organization_positions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting position:', error);
        return false;
    }
    return true;
}

// -- LEVELS --

export async function fetchLevels(): Promise<OrganizationLevel[]> {
    const { data, error } = await supabase
        .from('organization_levels')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching levels:', error);
        return [];
    }
    return data || [];
}

export async function upsertLevel(level: Partial<OrganizationLevel>): Promise<OrganizationLevel | null> {
    const payload: any = {
        code: level.code,
        name: level.name,
        level_code: level.level_code,
        roman_code: level.roman_code,
        status: level.status
    };

    if (level.id) {
        payload.id = level.id;
    }

    if (level.order_index !== undefined) {
        payload.order_index = level.order_index;
    }

    console.log("Saving level (upsert):", { id: level.id, payload });

    const { data, error } = await supabase
        .from('organization_levels')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

    if (error) {
        console.error('API Error: Error saving level:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            payload
        });
        return null;
    }

    if (!data && level.id) {
        console.warn("Operation succeeded but no data field returned. Likely RLS restriction.");
        return level as OrganizationLevel;
    }

    return data;
}

export async function deleteLevel(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('organization_levels')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting level:', error);
        return false;
    }
    return true;
}

// -- SYSTEM ROLES --

export async function fetchSystemRoles(): Promise<OrganizationSystemRole[]> {
    const { data, error } = await supabase
        .from('organization_system_roles')
        .select('*')
        .order('order_index', { ascending: true });

    if (error) {
        console.error('Error fetching system roles:', error);
        return [];
    }
    return data || [];
}

export async function upsertSystemRole(role: Partial<OrganizationSystemRole>): Promise<OrganizationSystemRole | null> {
    const payload: any = {
        code: role.code,
        name: role.name,
        description: role.description,
        status: role.status
    };

    if (role.id) payload.id = role.id;
    if (role.order_index !== undefined) payload.order_index = role.order_index;

    const { data, error } = await supabase
        .from('organization_system_roles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();

    if (error) {
        console.error('Error saving system role:', error);
        return null;
    }

    if (!data && role.id) return role as OrganizationSystemRole;
    return data;
}

export async function deleteSystemRole(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('organization_system_roles')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting system role:', error);
        return false;
    }
    return true;
}

// -- BATCH UPDATES (Reordering) --

export async function updateDepartmentOrder(items: OrganizationDepartment[]) {
    for (const item of items) {
        await supabase
            .from('organization_departments')
            .update({ order_index: item.order_index })
            .eq('id', item.id);
    }
}

export async function updateLevelOrder(items: OrganizationLevel[]) {
    for (const item of items) {
        await supabase
            .from('organization_levels')
            .update({ order_index: item.order_index })
            .eq('id', item.id);
    }
}

export async function updateSystemRoleOrder(items: OrganizationSystemRole[]) {
    for (const item of items) {
        await supabase
            .from('organization_system_roles')
            .update({ order_index: item.order_index })
            .eq('id', item.id);
    }
}
