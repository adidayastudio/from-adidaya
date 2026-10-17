import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { saveOrganization, resolveOrganizationRole } from '@/lib/organizationSettings';
import { useUserContext } from '@/context/UserProvider';
import { isAdidayaTenant } from '@/components/ui/TenantBrandLogo';

export interface Tenant {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string | null;
    branding_name?: string | null;
    branding_logo_url?: string | null;
    primary_color?: string | null;
    company_code?: string | null;
    join_code?: string | null;
    category?: string | null;
    setup_step?: string | null;
    is_setup_completed?: boolean;
    address?: string | null;
    gmaps_url?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    attendance_radius?: number | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    role?: string; // Role of current user in this tenant
}

export interface Workspace {
    id: string;
    tenant_id: string;
    name: string;
    slug?: string;
    logo_url?: string | null;
}

interface TenantContextType {
    tenants: Tenant[];
    activeTenant: Tenant | null;
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    isLoadingTenants: boolean;
    tenantRole: string | null;
    isSuperAdmin: boolean;
    switchTenant: (tenantId: string) => Promise<void>;
    switchWorkspace: (workspaceId: string) => Promise<void>;
    refreshTenants: (explicitUserId?: string) => Promise<Tenant[]>;
    updateTenant: (tenantId: string, payload: Partial<Tenant>) => Promise<{ error?: string }>;
    createTenant: (payload: {
        name: string;
        company_code: string;
        join_code?: string;
        category?: string;
        logo_url?: string;
        branding_logo_url?: string;
        primary_color?: string;
        address?: string;
        gmaps_url?: string;
        contact_email?: string;
        contact_phone?: string;
        initial_workspace_name?: string;
    }, explicitUserId?: string) => Promise<{ tenant?: Tenant; error?: string }>;
    joinTenantByCode: (code: string, explicitUserId?: string) => Promise<{ tenant?: Tenant; error?: string }>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const ACTIVE_TENANT_KEY = 'adidaya-preview:active_tenant_id';
const ACTIVE_WORKSPACE_KEY = 'adidaya-preview:active_workspace_id';

export function TenantProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated, profile } = useUserContext();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
    const [isLoadingTenants, setIsLoadingTenants] = useState(false);

    const refreshTenants = useCallback(async (explicitUserId?: string): Promise<Tenant[]> => {
        const userId = explicitUserId || user?.id;
        if (!userId) return [];
        setIsLoadingTenants(true);
        try {
            const configuredTenant = process.env.EXPO_PUBLIC_ADIDAYA_TENANT_ID;
            const { data: person, error: personError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
            if (personError) throw personError;
            let tenant: Tenant | null = null;
            const candidateId = configuredTenant || person?.tenant_id;
            if (candidateId) {
                const { data } = await supabase.from('tenants').select('*').eq('id', candidateId).maybeSingle();
                if (data && isAdidayaTenant(data)) tenant = data;
            }
            if (!tenant && !configuredTenant) {
                const { data, error } = await supabase.from('tenants').select('*').ilike('name', '%adidaya%').limit(2);
                if (error) throw error;
                if (data?.length === 1 && isAdidayaTenant(data[0])) tenant = data[0];
            }
            if (!tenant) throw new Error('Your Adidaya organization is unavailable. Please contact your administrator.');
            let { data: accountRole, error: roleError } = await supabase.from('adidaya_organization_members').select('role, status').eq('user_id', userId).maybeSingle();
            if (roleError?.code === 'PGRST205' || roleError?.code === '42P01') {
                const legacy = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle();
                accountRole = legacy.data as any; roleError = legacy.error;
            }
            if (roleError) throw roleError;
            const organizationRole = resolveOrganizationRole(accountRole as any, profile?.role);
            tenant = { ...tenant, role: organizationRole || 'member' };
            const { data: workspaceRows, error: workspaceError } = await supabase.from('workspaces').select('*').eq('tenant_id', tenant.id).order('name');
            if (workspaceError) throw workspaceError;
            const available = (workspaceRows || []) as Workspace[];
            const fixedWorkspace = process.env.EXPO_PUBLIC_ADIDAYA_WORKSPACE_ID;
            const workspace = fixedWorkspace
                ? available.find(w => w.id === fixedWorkspace) || null
                : available.find(w => w.id === person?.workspace_id) || available[0] || null;
            if (fixedWorkspace && !workspace) throw new Error('The configured Adidaya workspace is unavailable.');
            setTenants([tenant]); setActiveTenant(tenant);
            setWorkspaces(workspace ? [workspace] : []); setActiveWorkspace(workspace);
            await AsyncStorage.setItem(ACTIVE_TENANT_KEY, tenant.id);
            if (workspace) await AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id);
            else await AsyncStorage.removeItem(ACTIVE_WORKSPACE_KEY);
            return [tenant];
        } catch (error) {
            console.error('[Adidaya organization]', error instanceof Error ? error.message : 'Could not load organization.');
            return [];
        } finally { setIsLoadingTenants(false); }
    }, [user?.id, profile?.role]);

    const switchTenant = useCallback(async (id: string) => {
        if (id !== activeTenant?.id) throw new Error('This application is dedicated to Adidaya Studio.');
    }, [activeTenant?.id]);
    const switchWorkspace = useCallback(async (id: string) => {
        if (id !== activeWorkspace?.id) throw new Error('Workspace switching is disabled for this application.');
    }, [activeWorkspace?.id]);
    const createTenant: TenantContextType['createTenant'] = useCallback(async () => ({ error: 'Organization creation is disabled in Adidaya.' }), []);
    const joinTenantByCode: TenantContextType['joinTenantByCode'] = useCallback(async () => ({ error: 'Organization joining is disabled in Adidaya.' }), []);
    const updateTenant: TenantContextType['updateTenant'] = useCallback(async (id, payload) => {
        try {
            if (!activeTenant) return { error: 'Your organization is unavailable. Sign in again.' };
            const saved = await saveOrganization(supabase, activeTenant, id, activeTenant.role, payload);
            setActiveTenant(prev => prev?.id === id ? { ...prev, ...saved } : prev);
            setTenants(prev => prev.map(tenant => tenant.id === id ? { ...tenant, ...saved } : tenant));
            return {};
        } catch (error) {
            return { error: error instanceof Error ? error.message : String((error as any)?.message || 'Organization settings could not be saved.') };
        }
    }, [activeTenant, profile?.role]);

    useEffect(() => {
        if (isAuthenticated && user?.id) { void refreshTenants(); }
        else { setTenants([]); setActiveTenant(null); setWorkspaces([]); setActiveWorkspace(null); }
    }, [isAuthenticated, user?.id, refreshTenants]);
    const tenantRole = (activeTenant?.role || 'member').trim().toLowerCase().replace(/[\s_-]+/g, '');
    const isSuperAdmin = ['superadmin', 'owner', 'ceo'].includes(tenantRole);
    const value = useMemo(() => ({ tenants, activeTenant, workspaces, activeWorkspace, isLoadingTenants, tenantRole, isSuperAdmin, switchTenant, switchWorkspace, refreshTenants, updateTenant, createTenant, joinTenantByCode }), [tenants, activeTenant, workspaces, activeWorkspace, isLoadingTenants, tenantRole, isSuperAdmin, switchTenant, switchWorkspace, refreshTenants, updateTenant, createTenant, joinTenantByCode]);
    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

const DEFAULT_TENANT_CONTEXT: TenantContextType = {
    tenants: [],
    activeTenant: null,
    workspaces: [],
    activeWorkspace: null,
    isLoadingTenants: false,
    tenantRole: null,
    isSuperAdmin: false,
    switchTenant: async () => {},
    switchWorkspace: async () => {},
    refreshTenants: async () => [],
    updateTenant: async () => ({}),
    createTenant: async () => ({ error: 'Not inside TenantProvider' }),
    joinTenantByCode: async () => ({ error: 'Not inside TenantProvider' }),
};

export function useTenantContext() {
    const context = useContext(TenantContext);
    if (!context) {
        return DEFAULT_TENANT_CONTEXT;
    }
    return context;
}
