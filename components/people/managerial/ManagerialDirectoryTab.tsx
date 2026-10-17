import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearch } from '@/context/SearchContext';
import { useIsFocused } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Image, Platform, ActionSheetIOS, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { FinanceSummaryCard } from '@/components/finance/FinanceSummaryCard';
import { useTenantContext } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';
import { createBatchPeopleReminders } from '@/lib/workflows/peopleWorkflow';

export interface DirectoryMember {
    id: string;
    user_id: string;
    name: string;
    email: string;
    role: string;
    dept: string;
    position: string;
    subtitle: string;
    status: string;
    account_type: 'human' | 'system';
    initials: string;
    avatar_url?: string | null;
    display_id?: string | null;
    order_number?: string;
}

interface ManagerialDirectoryTabProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    selectedMemberId?: string;
    onSelectMember?: (member: DirectoryMember) => void;
    onMembersLoaded?: (members: DirectoryMember[]) => void;
}

function getInitials(nameOrEmail?: string) {
    if (!nameOrEmail) return 'U';
    const clean = nameOrEmail.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
}

function cleanTeamRole(rawRole?: string) {
    if (!rawRole) return 'Member';
    const lower = rawRole.toLowerCase();
    if (lower === 'superadmin' || lower === 'super_admin') return 'Super Admin';
    if (lower === 'admin' || lower === 'administrator') return 'Admin';
    if (lower === 'viewer') return 'Viewer';
    if (lower === 'system') return 'System';
    if (lower === 'member') return 'Member';
    return rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
}

const SORT_OPTIONS = [
    'Name (A - Z)',
    'Name (Z - A)',
    'Role / Position',
    'Department',
    'Order (001 → 999)',
    'Order (999 → 001)',
];



export function ManagerialDirectoryTab({ isDark, textColor, subtextColor, selectedMemberId, onSelectMember }: ManagerialDirectoryTabProps) {
    const router = useRouter();
    const { searchQuery } = useSearch();
    const { activeTenant } = useTenantContext();
    const [directoryFilter, setDirectoryFilter] = useState('Total Staff');
    const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
    const [selectedSortIndex, setSelectedSortIndex] = useState(0);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [members, setMembers] = useState<DirectoryMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [isCreatingReminder, setIsCreatingReminder] = useState(false);

    const primaryColor = activeTenant?.primary_color || '#10B981';
    const cardBgColor = isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const tenantId = activeTenant?.id;
            if (!tenantId) {
                setMembers([]);
                onMembersLoaded?.([]);
                setLoading(false);
                return;
            }

            const isUuid = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
            const isTenantUuid = isUuid(tenantId);

            // Fetch tenant members, organization departments, positions & work status concurrently
            let tmQuery = supabase
                .from('tenant_members')
                .select('id, role, status, user_id, tenant_id, created_at')
                .order('created_at', { ascending: false });

            if (isTenantUuid) {
                tmQuery = tmQuery.eq('tenant_id', tenantId);
            }

            let deptsQuery = supabase
                .from('organization_departments')
                .select('id, name');

            if (isTenantUuid) {
                deptsQuery = deptsQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
            }

            let [{ data: rawMembersData }, { data: deptsData }, { data: posData }, { data: wsData }] = await Promise.all([
                tmQuery,
                deptsQuery,
                supabase
                    .from('organization_positions')
                    .select('id, name, department_id'),
                supabase
                    .from('work_status')
                    .select('id, name'),
            ]);

            // Strictly isolate members for active tenant
            const membersData = (rawMembersData || []).filter((m: any) => !isTenantUuid || m.tenant_id === tenantId);
            const userIds = Array.from(new Set((membersData || []).map((m: any) => m.user_id).filter(Boolean)));

            // Retrieve profiles strictly for these tenant members
            let profiles: any[] = [];
            if (userIds.length > 0) {
                const { data: profs, error: pError } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', userIds);
                if (pError) console.error('Error fetching directory profiles:', pError);
                if (profs) profiles = profs;
            }

            // Also retrieve any profiles explicitly scoped to this tenant_id if UUID
            if (isTenantUuid) {
                const { data: tenantProfs } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('tenant_id', tenantId);
                if (tenantProfs && tenantProfs.length > 0) {
                    const existingIds = new Set(profiles.map((p: any) => p.id));
                    tenantProfs.forEach((tp: any) => {
                        if (!existingIds.has(tp.id)) {
                            profiles.push(tp);
                            existingIds.add(tp.id);
                        }
                    });
                }
            }

            const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
            const memberMap = new Map<string, DirectoryMember>();

            // 1. Process explicit tenant_members
            (membersData || []).forEach((tm: any) => {
                const uid = tm.user_id;
                if (!uid) return;
                const prof = profileMap.get(uid) || {};
                let name = prof.full_name || prof.display_name || prof.name || prof.username;
                if (!name && (prof.email || tm.email)) {
                    const emailStr = prof.email || tm.email || '';
                    const userPart = emailStr.split('@')[0];
                    name = userPart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                }
                if (!name) name = 'Team Member';

                const email = prof.email || '—';
                const isTest = (prof.full_name || '').toLowerCase().includes('test_') ||
                               (prof.email || '').toLowerCase().includes('test_') ||
                               (prof.email || '').toLowerCase().includes('testuser');
                if (isTest) return;

                const rawRole = tm.role || (prof.role === 'superadmin' ? 'Super Admin' : prof.role === 'admin' ? 'Admin' : prof.role || 'Member');
                const role = cleanTeamRole(rawRole);
                const accType = (prof.account_type || '').toLowerCase();
                const isSystem = accType.includes('system') || prof.type === 'system';
                const account_type = isSystem ? 'system' : 'human';

                // Resolve Department
                let resolvedDept = !isSystem && prof.department ? String(prof.department).trim() : '';
                if (!resolvedDept && !isSystem && prof.department_id && deptsData) {
                    const dObj = deptsData.find((d: any) => d.id === prof.department_id);
                    if (dObj) resolvedDept = dObj.name;
                }

                // Resolve Position
                let resolvedPos = !isSystem && (prof.position || prof.job_title) ? String(prof.position || prof.job_title).trim() : '';
                if (!resolvedPos && !isSystem && prof.position_id && posData) {
                    const pObj = posData.find((p: any) => p.id === prof.position_id);
                    if (pObj) resolvedPos = pObj.name;
                }

                if (resolvedPos.toLowerCase() === role.toLowerCase() || resolvedPos.toLowerCase() === rawRole.toLowerCase() || resolvedPos.toLowerCase() === resolvedDept.toLowerCase()) {
                    resolvedPos = '';
                }

                // Build Subtitle
                let subtitle = role;
                if (!isSystem) {
                    if (resolvedDept && resolvedPos) {
                        subtitle = `${resolvedDept} • ${resolvedPos}`;
                    } else if (resolvedDept) {
                        subtitle = resolvedDept;
                    } else {
                        subtitle = role;
                    }
                } else {
                    subtitle = 'System Account';
                }

                // Resolve Work Status
                let resolvedStatus = '';
                if (prof.work_status_id && wsData) {
                    const wsObj = wsData.find((w: any) => w.id === prof.work_status_id);
                    if (wsObj) resolvedStatus = wsObj.name;
                }
                if (!resolvedStatus && prof.work_status) {
                    resolvedStatus = prof.work_status;
                }
                if (!resolvedStatus && tm.status) {
                    resolvedStatus = tm.status;
                }
                if (!resolvedStatus && prof.status) {
                    resolvedStatus = prof.status;
                }
                if (!resolvedStatus) {
                    resolvedStatus = 'Active';
                }

                const status = resolvedStatus.trim();
                const display_id = prof.id?.slice(0, 8);

                let rawOrder = prof.order_number ? String(prof.order_number) : '';
                if (!rawOrder) {
                    const matchFromDisplay = (prof.display_id || '').match(/\d{3}$/);
                    if (matchFromDisplay) rawOrder = matchFromDisplay[0];
                    else {
                        const matchFromEmp = (prof.employee_id || prof.id_number || '').match(/(\d{3})$/);
                        if (matchFromEmp) rawOrder = matchFromEmp[1];
                    }
                }
                const order_number = rawOrder ? rawOrder.replace(/[^0-9]/g, '').padStart(3, '0') : '';

                memberMap.set(uid, {
                    id: tm.id || prof.id || uid,
                    user_id: uid,
                    name,
                    email,
                    role,
                    dept: resolvedDept,
                    position: resolvedPos,
                    subtitle,
                    status,
                    account_type,
                    initials: getInitials(name),
                    avatar_url: prof.avatar_url,
                    display_id,
                    order_number,
                });
            });

            // 2. Include any profiles directly scoped to this tenant that aren't yet in memberMap
            (profiles || []).forEach((prof: any) => {
                if (!prof?.id || memberMap.has(prof.id)) return;
                const isTest = (prof.full_name || '').toLowerCase().includes('test_') ||
                               (prof.email || '').toLowerCase().includes('test_') ||
                               (prof.email || '').toLowerCase().includes('testuser');
                if (isTest) return;

                if (isTenantUuid && (prof.tenant_id === tenantId || prof.workspace_id === tenantId)) {
                    let name = prof.full_name || prof.display_name || prof.name || prof.username;
                    if (!name && prof.email) {
                        const userPart = prof.email.split('@')[0];
                        name = userPart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                    }
                    if (!name) name = 'Team Member';

                    const email = prof.email || '—';
                    const rawRole = prof.role || 'Member';
                    const role = cleanTeamRole(rawRole);
                    const accType = (prof.account_type || '').toLowerCase();
                    const isSystem = accType.includes('system') || prof.type === 'system';
                    const account_type = isSystem ? 'system' : 'human';

                    let resolvedDept = !isSystem && prof.department ? String(prof.department).trim() : '';
                    if (!resolvedDept && !isSystem && prof.department_id && deptsData) {
                        const dObj = deptsData.find((d: any) => d.id === prof.department_id);
                        if (dObj) resolvedDept = dObj.name;
                    }

                    let resolvedPos = !isSystem && (prof.position || prof.job_title) ? String(prof.position || prof.job_title).trim() : '';
                    if (!resolvedPos && !isSystem && prof.position_id && posData) {
                        const pObj = posData.find((p: any) => p.id === prof.position_id);
                        if (pObj) resolvedPos = pObj.name;
                    }

                    let subtitle = role;
                    if (!isSystem) {
                        if (resolvedDept && resolvedPos) subtitle = `${resolvedDept} • ${resolvedPos}`;
                        else if (resolvedDept) subtitle = resolvedDept;
                    } else {
                        subtitle = 'System Account';
                    }

                    const display_id = prof.id?.slice(0, 8);
                    memberMap.set(prof.id, {
                        id: prof.id,
                        user_id: prof.id,
                        name,
                        email,
                        role,
                        dept: resolvedDept,
                        position: resolvedPos,
                        subtitle,
                        status: prof.status || 'Active',
                        account_type,
                        initials: getInitials(name),
                        avatar_url: prof.avatar_url,
                        display_id,
                        order_number: '',
                    });
                }
            });

            const loadedMembers = Array.from(memberMap.values());
            setMembers(loadedMembers);
            onMembersLoaded?.(loadedMembers);
        } catch (err) {
            console.error('Error loading directory members:', err);
        } finally {
            setLoading(false);
        }
    }, [activeTenant?.id]);

    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchMembers();
        }
    }, [isFocused, fetchMembers]);

    // Calculate real stats strictly differentiating human vs system accounts
    const stats = useMemo(() => {
        const humanMembers = members.filter(m => m.account_type !== 'system');
        const total = humanMembers.length;
        const active = humanMembers.filter(m => (m.status || '').toLowerCase() === 'active').length;
        const inactive = humanMembers.filter(m => (m.status || '').toLowerCase() !== 'active').length;
        const system = members.filter(m => m.account_type === 'system').length;

        return { total, active, inactive, system };
    }, [members]);

    const filters = [
        { id: 'total', label: 'Total Staff', count: stats.total, desc: 'Human accounts', icon: 'person.2.fill', color: '#007AFF' },
        { id: 'active', label: 'Active', count: stats.active, desc: 'Currently working', icon: 'person.fill.checkmark', color: '#34C759' },
        { id: 'inactive', label: 'Not Active', count: stats.inactive, desc: 'Leave / Inactive', icon: 'person.fill.xmark', color: '#FF9500' },
        { id: 'system', label: 'System Accounts', count: stats.system, desc: 'Non-human accounts', icon: 'cpu.fill', color: '#8E8E93' },
    ];

    const availableDepartments = useMemo(() => {
        const set = new Set<string>();
        members.forEach(m => {
            if (m.dept) set.add(m.dept);
        });
        return Array.from(set).sort();
    }, [members]);

    const deptOptions = useMemo(() => {
        return ['All Departments', ...availableDepartments];
    }, [availableDepartments]);

    const deptActions: ContextMenuAction[] = useMemo(() => {
        return deptOptions.map((d, idx) => ({
            title: d,
            state: ((selectedDeptFilter === 'ALL' && idx === 0) || selectedDeptFilter === d) ? 'on' : 'off',
        }));
    }, [deptOptions, selectedDeptFilter]);

    const filteredEmployees = useMemo(() => {
        let list = members;

        // 1. Apply stat filter (Total Staff, Active, Not Active, System Accounts)
        if (directoryFilter === 'Total Staff') {
            list = list.filter(m => m.account_type !== 'system');
        } else if (directoryFilter === 'Active') {
            list = list.filter(m => m.account_type !== 'system' && (m.status || '').toLowerCase() === 'active');
        } else if (directoryFilter === 'Not Active') {
            list = list.filter(m => m.account_type !== 'system' && (m.status || '').toLowerCase() !== 'active');
        } else if (directoryFilter === 'System Accounts') {
            list = list.filter(m => m.account_type === 'system');
        }

        // 2. Apply Department filter
        if (selectedDeptFilter !== 'ALL') {
            list = list.filter(m => (m.dept || '').toLowerCase() === selectedDeptFilter.toLowerCase());
        }

        // 3. Apply search query (from local search or top context)
        const q = (localSearchQuery || searchQuery || '').toLowerCase().trim();
        if (q) {
            list = list.filter(emp => 
                emp.name.toLowerCase().includes(q) || 
                emp.role.toLowerCase().includes(q) || 
                emp.dept.toLowerCase().includes(q) ||
                (emp.display_id && emp.display_id.toLowerCase().includes(q)) ||
                (emp.order_number && emp.order_number.includes(q)) ||
                emp.email.toLowerCase().includes(q)
            );
        }

        // 4. Apply Sorting (Name A-Z, Name Z-A, Role, Department, Order Number)
        const sorted = [...list].sort((a, b) => {
            if (selectedSortIndex === 0) {
                // Name (A - Z)
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            }
            if (selectedSortIndex === 1) {
                // Name (Z - A)
                return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
            }
            if (selectedSortIndex === 2) {
                // Role / Position
                const posA = a.position || a.role || '';
                const posB = b.position || b.role || '';
                const comp = posA.localeCompare(posB, undefined, { sensitivity: 'base' });
                return comp !== 0 ? comp : a.name.localeCompare(b.name);
            }
            if (selectedSortIndex === 3) {
                // Department
                const deptA = a.dept || '';
                const deptB = b.dept || '';
                const comp = deptA.localeCompare(deptB, undefined, { sensitivity: 'base' });
                return comp !== 0 ? comp : a.name.localeCompare(b.name);
            }
            if (selectedSortIndex === 4) {
                // Order Number (001 -> 999)
                const numA = parseInt(a.order_number || '999999', 10);
                const numB = parseInt(b.order_number || '999999', 10);
                if (numA !== numB) return numA - numB;
                return a.name.localeCompare(b.name);
            }
            if (selectedSortIndex === 5) {
                // Order Number (999 -> 001)
                const numA = parseInt(a.order_number || '0', 10);
                const numB = parseInt(b.order_number || '0', 10);
                if (numA !== numB) return numB - numA;
                return a.name.localeCompare(b.name);
            }
            return 0;
        });

        return sorted;
    }, [members, directoryFilter, selectedDeptFilter, localSearchQuery, searchQuery, selectedSortIndex]);

    const handleFilterPress = (filterLabel: string) => {
        Haptics.selectionAsync();
        setDirectoryFilter(filterLabel);
    };

    const handleMemberPress = (emp: DirectoryMember) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onSelectMember) {
            onSelectMember(emp);
            return;
        }
        router.push({
            pathname: '/member-profile/[id]',
            params: {
                id: emp.user_id || emp.id,
                name: emp.name,
                dept: emp.dept,
                role: emp.role,
                status: emp.status,
                email: emp.email,
            },
        } as any);
    };

    const handleMemberLongPress = (emp: DirectoryMember) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: emp.name,
                    message: `Department: ${emp.dept}\nRole: ${emp.role}\nEmail: ${emp.email}`,
                    options: ['Cancel', 'View Full Profile', 'Copy Email'],
                    cancelButtonIndex: 0,
                },
                async (btnIdx) => {
                    if (btnIdx === 1) {
                        handleMemberPress(emp);
                    } else if (btnIdx === 2 && emp.email && emp.email !== '—') {
                        await Clipboard.setStringAsync(emp.email);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert('Copied', 'Email copied to clipboard.');
                    }
                }
            );
        } else {
            Alert.alert(
                emp.name,
                `Department: ${emp.dept}\nRole: ${emp.role}\nEmail: ${emp.email}\nStatus: ${emp.status.toUpperCase()}`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'View Profile', onPress: () => handleMemberPress(emp) },
                ]
            );
        }
    };

    return (
        <View style={s.directoryContainer}>
            {/* 1. STAT CARDS (Exact Finance Style: Colored Tint when Active, No Borders) */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterCardsScroll}
            >
                {filters.map((f) => {
                    const isActive = directoryFilter === f.label;
                    return (
                        <FinanceSummaryCard
                            key={f.id}
                            icon={f.icon as any}
                            iconColor={f.color}
                            label={f.label}
                            value={String(f.count)}
                            subValue={f.desc}
                            style={{
                                width: 145,
                                marginBottom: 0,
                                backgroundColor: isActive
                                    ? (isDark ? `${f.color}45` : `${f.color}25`)
                                    : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                borderColor: 'transparent',
                                borderWidth: 0,
                            }}
                            onPress={() => handleFilterPress(f.label)}
                        />
                    );
                })}
            </ScrollView>

            {/* 2. CONTROL ROW (Department Filter Context Menu + Sort Menu Picker + Search Toggle Pill) */}
            <View style={s.controlRowContainer}>
                {/* Department Filter Context Menu */}
                <ContextMenu
                    actions={deptActions}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        Haptics.selectionAsync();
                        const selected = deptOptions[e.nativeEvent.index];
                        if (selected === 'All Departments') {
                            setSelectedDeptFilter('ALL');
                        } else {
                            setSelectedDeptFilter(selected);
                        }
                    }}
                    style={{ flex: 1, height: 42 }}
                >
                    <View
                        style={[
                            s.roleSelectPill,
                            {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                            }
                        ]}
                    >
                        <Text style={[s.controlPillText, { color: textColor }]} numberOfLines={1}>
                            {selectedDeptFilter === 'ALL' ? 'All Departments' : selectedDeptFilter}
                        </Text>
                        <PlatformIcon name="chevron.down" size={12} tintColor={textColor} style={{ marginLeft: 6 }} />
                    </View>
                </ContextMenu>

                {/* Sort Menu Picker */}
                <SortMenuPicker
                    options={SORT_OPTIONS}
                    selectedIndex={selectedSortIndex}
                    onSelect={(idx) => setSelectedSortIndex(idx)}
                    isDark={isDark}
                    textColor={textColor}
                    style={{
                        height: 42,
                        borderRadius: 21,
                        paddingHorizontal: 14,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    }}
                />

                {/* Search Toggle Pill */}
                <TouchableOpacity
                    onPress={() => setIsSearchVisible(!isSearchVisible)}
                    style={[
                        s.searchButtonPill,
                        {
                            backgroundColor: (isSearchVisible || localSearchQuery)
                                ? (isDark ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.12)')
                                : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF'),
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        }
                    ]}
                >
                    <PlatformIcon 
                        name="magnifyingglass" 
                        size={16} 
                        tintColor={(isSearchVisible || localSearchQuery) ? '#007AFF' : textColor} 
                    />
                </TouchableOpacity>
            </View>

            {/* 3. INLINE SEARCH INPUT (identical to Finance) */}
            {isSearchVisible && (
                <View
                    style={[
                        s.inlineSearchContainer,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        }
                    ]}
                >
                    <PlatformIcon name="magnifyingglass" size={16} tintColor={subtextColor} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search members by name or email..."
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        style={[s.inlineSearchInput, { color: textColor }]}
                        value={localSearchQuery}
                        onChangeText={setLocalSearchQuery}
                        returnKeyType="search"
                        autoFocus
                    />
                    {localSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setLocalSearchQuery('')} style={{ padding: 4, marginRight: 8 }}>
                            <PlatformIcon name="xmark.circle.fill" size={16} tintColor={subtextColor} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => {
                            setIsSearchVisible(false);
                            setLocalSearchQuery('');
                        }}
                        style={s.inlineCancelButton}
                    >
                        <Text style={{ color: subtextColor, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* 4. EMPLOYEE DIRECTORY LIST (Identical to Org Settings Team Design) */}
            {loading ? (
                <View style={s.loadingBox}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={[s.loadingText, { color: subtextColor }]}>Loading team members...</Text>
                </View>
            ) : filteredEmployees.length === 0 ? (
                <View style={s.emptyBox}>
                    <PlatformIcon name="person.2" size={36} tintColor={subtextColor} />
                    <Text style={[s.emptyTitle, { color: textColor }]}>No members found</Text>
                    <Text style={[s.emptyDesc, { color: subtextColor }]}>
                        {searchQuery ? `No results matching "${searchQuery}"` : 'No team members in this category.'}
                    </Text>
                </View>
            ) : (
                <View style={s.employeeList}>
                    {filteredEmployees.map((emp) => {
                        const isSystem = emp.account_type === 'system';
                        const stLower = (emp.status || 'Active').toLowerCase();
                        const isEmpActive = stLower === 'active';
                        const isEmpProbation = stLower === 'probation';
                        const isEmpResigned = stLower === 'resigned' || stLower === 'terminated';

                        let statusColor = '#FF9500';
                        if (isSystem) statusColor = '#8E8E93';
                        else if (isEmpActive) statusColor = '#10B981';
                        else if (isEmpProbation) statusColor = '#007AFF';
                        else if (isEmpResigned) statusColor = '#EF4444';

                        const statusLabel = isSystem
                            ? 'System'
                            : (emp.status ? (emp.status.charAt(0).toUpperCase() + emp.status.slice(1)) : 'Active');

                        const isCurrentActive = selectedMemberId === (emp.user_id || emp.id);

                        return (
                            <TouchableOpacity 
                                key={emp.id} 
                                activeOpacity={0.7} 
                                onPress={() => handleMemberPress(emp)}
                                onLongPress={() => handleMemberLongPress(emp)}
                            >
                                <View style={[
                                    s.memberCard, 
                                    { 
                                        backgroundColor: isCurrentActive ? (isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.06)') : cardBgColor, 
                                        borderColor: isCurrentActive ? '#007AFF' : borderColor, 
                                        borderWidth: isCurrentActive ? 1.5 : 1 
                                    }
                                ]}>
                                    <View style={s.memberCardContent}>
                                        {/* Avatar */}
                                        {emp.avatar_url ? (
                                            <Image source={{ uri: emp.avatar_url }} style={s.memberAvatar} />
                                        ) : (
                                            <View style={[s.memberAvatar, { backgroundColor: isSystem ? (isDark ? '#3A3A3C' : '#8E8E93') : primaryColor }]}>
                                                <Text style={s.memberAvatarText}>{emp.initials}</Text>
                                            </View>
                                        )}

                                        {/* Info: Name, Posisi & Departemen */}
                                        <View style={s.memberInfoCol}>
                                            <Text style={[s.memberName, { color: textColor }]} numberOfLines={1}>
                                                {emp.name}
                                            </Text>
                                            {emp.position ? (
                                                <Text style={[s.memberPosition, { color: textColor, opacity: 0.85 }]} numberOfLines={1}>
                                                    {emp.position}
                                                </Text>
                                            ) : null}
                                            <Text style={[s.memberDept, { color: subtextColor, marginTop: emp.position ? 1 : 2 }]} numberOfLines={1}>
                                                {isSystem ? 'System Account' : (emp.dept || (!emp.position ? emp.role : ''))}
                                            </Text>
                                        </View>

                                        {/* Active Status Badge */}
                                        <View style={[s.statusBadge, { backgroundColor: statusColor + '18' }]}>
                                            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                                            <Text style={[s.statusBadgeText, { color: statusColor }]}>
                                                {statusLabel}
                                            </Text>
                                        </View>

                                        {!isSelectMode && (
                                            <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} style={s.empChevron} />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Batch Reminder Floating Action Button */}
            {isSelectMode && selectedMemberIds.size > 0 && (
                <View style={s.batchFloatingBar}>
                    <TouchableOpacity
                        onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            Alert.alert(
                                'Create Reminder',
                                `Send manual profile & document reminder Task to ${selectedMemberIds.size} selected employee(s)?`,
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Create Reminders',
                                        onPress: async () => {
                                            setIsCreatingReminder(true);
                                            try {
                                                const count = await createBatchPeopleReminders(
                                                    Array.from(selectedMemberIds),
                                                    'Complete Profile & Document Submission',
                                                    'Management reminder: Please complete your missing profile fields and mandatory documents.'
                                                );
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                Alert.alert('Success', `Created ${count} reminder task(s) for selected employees.`);
                                                setIsSelectMode(false);
                                                setSelectedMemberIds(new Set());
                                            } catch (e: any) {
                                                Alert.alert('Error', e.message || 'Failed to create reminders.');
                                            } finally {
                                                setIsCreatingReminder(false);
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                        disabled={isCreatingReminder}
                        style={[s.createReminderButton, { opacity: isCreatingReminder ? 0.7 : 1 }]}
                    >
                        {isCreatingReminder ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <PlatformIcon name="bell.badge.fill" size={16} tintColor="#FFFFFF" />
                                <Text style={s.createReminderButtonText}>
                                    Create Reminder ({selectedMemberIds.size})
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    directoryContainer: {
        gap: 14,
    },
    filterCardsScroll: {
        paddingHorizontal: 0,
        gap: 8,
        paddingBottom: 2,
    },
    controlRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    roleSelectPill: {
        width: '100%',
        height: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 21,
        borderWidth: 1,
        paddingHorizontal: 16,
    },
    searchButtonPill: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlPillText: {
        fontSize: 13,
        fontWeight: '700',
    },
    inlineSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 42,
        borderRadius: 21,
        paddingHorizontal: 14,
        borderWidth: 1,
    },
    inlineSearchInput: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: 0,
    },
    inlineCancelButton: {
        paddingLeft: 8,
        paddingVertical: 4,
    },
    employeeList: {
        gap: 10,
        paddingBottom: 24,
    },
    memberCard: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    memberCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    memberAvatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    memberInfoCol: {
        marginLeft: 14,
        flex: 1,
        justifyContent: 'center',
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    memberPosition: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    memberDept: {
        fontSize: 12,
        fontWeight: '400',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    empChevron: {
        marginLeft: 8,
    },
    loadingBox: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 13,
        fontWeight: '500',
    },
    emptyBox: {
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 6,
    },
    emptyDesc: {
        fontSize: 13,
        textAlign: 'center',
    },
    selectTogglePill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        paddingHorizontal: 14,
    },
    checkboxCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    batchFloatingBar: {
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        alignItems: 'center',
    },
    createReminderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        height: 48,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
        width: '100%',
    },
    createReminderButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
