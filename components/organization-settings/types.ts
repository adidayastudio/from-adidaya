import { Ionicons } from '@expo/vector-icons';

export type CategoryId =
    | 'general'
    | 'account'
    | 'team'
    | 'roles'
    | 'permissions'
    | 'notifications'
    | 'integrations'
    | 'security'
    | 'logout';

export type OrganizationSetupGroup = 'general' | 'access' | 'system';

export interface SettingCategory {
    id: CategoryId;
    group?: OrganizationSetupGroup;
    title: string;
    description: string;
    subtitle?: string;
    icon: string;
    badges: string[];
    color?: string;
    gradientColors?: [string, string];
    isDestructive?: boolean;
}

export type RoleOption = 'Member' | 'Super Admin' | 'Admin' | 'Viewer' | 'System';

export interface TeamMember {
    id: string;
    role: string;
    status?: string;
    email?: string;
    user_id?: string;
    profile?: {
        id?: string;
        full_name?: string;
        username?: string;
        email?: string;
        avatar_url?: string;
        status?: string;
    };
}

export type PermissionKey =
    | 'dashboard'
    | 'general_settings'
    | 'team_members'
    | 'roles_permissions'
    | 'project_module'
    | 'financial_module'
    | 'hr_module'
    | 'reports_module'
    | 'export_data'
    | 'api_integrations';

export interface PermissionItemDef {
    key: PermissionKey;
    label: string;
    desc?: string;
}

export type RoleId = 'system' | 'super_admin' | 'admin' | 'member' | 'viewer';

export interface RoleDef {
    id: RoleId;
    title: string;
    level: string;
    isLocked?: boolean;
    badgeColor?: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
    desc: string;
    defaultPermissions: Record<PermissionKey, boolean>;
}
