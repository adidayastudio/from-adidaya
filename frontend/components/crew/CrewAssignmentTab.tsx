import React, { useState, useMemo, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Platform,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Assignment, Project, CrewMember, CrewRole, CREW_ROLE_LABELS, matchProjectCode } from './mockData';
import * as FileSystem from 'expo-file-system/legacy';
import { SearchablePicker } from '@/components/ui/SearchablePicker';

// Safe lazy loading of expo-print and expo-sharing
let Print: any = null;
let Sharing: any = null;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {
    // handled
}

const ROLE_OPTIONS: { value: CrewRole | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'All Roles' },
    { value: 'FOREMAN', label: 'Foreman (Mandor)' },
    { value: 'LEADER', label: 'Team Leader (Ketua Tim)' },
    { value: 'SKILLED', label: 'Skilled Worker (Tukang)' },
    { value: 'HELPER', label: 'Helper (Kenek)' },
    { value: 'OPERATOR', label: 'Operator (Operator)' },
    { value: 'GENERAL', label: 'General Worker (Pekerja Umum)' },
];

interface CrewAssignmentTabProps {
    assignments: Assignment[];
    projects: Project[];
    crewMembers?: CrewMember[];
    onAddAssignment: (preselectedCrewId?: string) => void;
    onSelectAssignment: (assignment: Assignment) => void;
    showFilters?: boolean;
    onExportRegister?: (exportFn: () => void) => void;
    onViewDocument?: (html: string, title: string) => void;
    selectedAssignmentId?: string;
}

export function CrewAssignmentTab({
    assignments,
    projects,
    crewMembers = [],
    onAddAssignment,
    onSelectAssignment,
    showFilters = false,
    onExportRegister,
    onViewDocument,
    selectedAssignmentId,
}: CrewAssignmentTabProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'UNASSIGNED'>('ALL');
    const [selectedRole, setSelectedRole] = useState<CrewRole | 'ALL'>('ALL');

    // Month filter state - defaults to current month (YYYY-MM format)
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

    const monthNames = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], []);
    const monthItems = useMemo(() => {
        const items = [{ id: 'ALL', label: 'All Months', sublabel: 'ALL' }];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const mIdx = d.getMonth();
            const monthVal = `${y}-${String(mIdx + 1).padStart(2, '0')}`;
            const label = `${monthNames[mIdx]} ${y}`;
            items.push({
                id: monthVal,
                label,
                sublabel: monthNames[mIdx]
            });
        }
        return items;
    }, [monthNames]);

    const monthPillLabel = useMemo(() => {
        if (selectedMonth === 'ALL') return 'All Months';
        const found = monthItems.find(item => item.id === selectedMonth);
        return found ? found.label : selectedMonth;
    }, [selectedMonth, monthItems]);

    const [isProjectPickerVisible, setIsProjectPickerVisible] = useState(false);
    const [isRolePickerVisible, setIsRolePickerVisible] = useState(false);

    const handleMetricPress = (status: 'ALL' | 'ACTIVE' | 'COMPLETED' | 'UNASSIGNED') => {
        setSelectedStatusFilter(prev => prev === status ? 'ALL' : status);
    };

    // Calculate metrics
    const totalAssign = assignments.length;
    const activeAssign = assignments.filter(a => a.status === 'ACTIVE').length;
    const completedAssign = assignments.filter(a => a.status === 'COMPLETED').length;
    const unassignedCrewCount = useMemo(() => {
        return crewMembers.filter(m => !assignments.some(a => a.crewId === m.id && a.status === 'ACTIVE')).length;
    }, [crewMembers, assignments]);

    const unassignedCrewList = useMemo(() => {
        return crewMembers
            .filter(m => {
                const hasActive = assignments.some(a => a.crewId === m.id && a.status === 'ACTIVE');
                if (hasActive) return false;
                
                const roleLabel = (CREW_ROLE_LABELS[m.role] || m.role).toLowerCase();
                const searchLower = search.toLowerCase();
                
                const matchesSearch = m.name.toLowerCase().includes(searchLower) ||
                    roleLabel.includes(searchLower);
                
                const matchesRole = selectedRole === 'ALL' || m.role === selectedRole;
                
                return matchesSearch && matchesRole;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [crewMembers, assignments, search, selectedRole]);

    // Group logic to show at most 1 card per crew member
    const filteredAssignments = useMemo(() => {
        const groups: Record<string, Assignment[]> = {};
        assignments.forEach(assign => {
            if (!groups[assign.crewId]) {
                groups[assign.crewId] = [];
            }
            groups[assign.crewId].push(assign);
        });

        const representativeAssignments: Assignment[] = [];
        Object.values(groups).forEach(memberAssigns => {
            const active = memberAssigns.find(a => a.status === 'ACTIVE');
            if (active) {
                representativeAssignments.push(active);
            } else {
                const sorted = [...memberAssigns].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
                if (sorted[0]) {
                    representativeAssignments.push(sorted[0]);
                }
            }
        });

        return representativeAssignments
            .filter(assign => {
                const project = projects.find(p => p.code === assign.projectCode);
                const projectName = project ? project.name.toLowerCase() : '';
                const projectCode = assign.projectCode.toLowerCase();
                const projectNum = assign.projectCode ? (assign.projectCode.split('-')[1] || '').toLowerCase() : '';
                const roleLabel = (CREW_ROLE_LABELS[assign.crewRole] || assign.crewRole).toLowerCase();
                const searchLower = search.toLowerCase();

                const matchesSearch = assign.crewName.toLowerCase().includes(searchLower) ||
                    roleLabel.includes(searchLower) ||
                    projectCode.includes(searchLower) ||
                    projectNum.includes(searchLower) ||
                    projectName.includes(searchLower);

                const matchesProject = selectedProjectFilter === 'ALL' || matchProjectCode(assign.projectCode, selectedProjectFilter);
                const matchesStatus = selectedStatusFilter === 'ALL' || assign.status === selectedStatusFilter;
                const matchesRole = selectedRole === 'ALL' || assign.crewRole === selectedRole;

                const matchesMonth = (() => {
                    if (selectedMonth === 'ALL') return true;
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
                    const lastDay = new Date(year, month, 0).getDate();
                    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
                    return assign.startDate <= monthEnd && (!assign.endDate || assign.endDate >= monthStart);
                })();

                return matchesSearch && matchesProject && matchesStatus && matchesRole && matchesMonth;
            })
            .sort((a, b) => a.crewName.localeCompare(b.crewName));
    }, [assignments, projects, search, selectedProjectFilter, selectedStatusFilter, selectedRole, selectedMonth]);

    const handleExportAssignment = async () => {
        if (!Print || !Sharing) {
            alert('Export module is not available on this device.');
            return;
        }
        try {
            const rowsHtml = filteredAssignments.map((assign, idx) => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${assign.crewName}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${CREW_ROLE_LABELS[assign.crewRole as CrewRole] || assign.crewRole}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${assign.projectCode}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formatDate(assign.startDate)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${assign.endDate ? formatDate(assign.endDate) : 'Ongoing'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">
                        <span style="padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; background-color: ${assign.status === 'ACTIVE' ? '#E8F5E9; color: #2E7D32;' : '#ECEFF1; color: #37474F;'}">
                            ${assign.status}
                        </span>
                    </td>
                </tr>
            `).join('');

            const timestamp = new Date().toLocaleString('en-US', {
                dateStyle: 'long',
                timeStyle: 'medium'
            });

            const htmlContent = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #333; }
                            h2 { color: #AF52DE; text-align: center; margin-bottom: 5px; }
                            .meta { text-align: center; color: #666; font-size: 13px; margin-bottom: 25px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                            th { background-color: #AF52DE; color: white; padding: 10px; text-align: left; }
                            td { padding: 10px; }
                            .footer { margin-top: 35px; font-size: 10px; color: #8E8E93; text-align: center; border-top: 1px solid #E5E5EA; padding-top: 10px; }
                        </style>
                    </head>
                    <body>
                        <h2>PT MAHARDIKA ADIDAYA - PROJECT ASSIGNMENTS</h2>
                        <div class="meta">
                            Project Filter: ${selectedProjectFilter === 'ALL' ? 'All Projects' : selectedProjectFilter} | Status Filter: ${selectedStatusFilter === 'ALL' ? 'All Statuses' : selectedStatusFilter} | Month: ${monthPillLabel} | Total: ${filteredAssignments.length} Assignments
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 5%; text-align: center;">No</th>
                                    <th>Crew Name</th>
                                    <th>Role</th>
                                    <th>Project Code</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th style="width: 15%; text-align: center;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                        <div class="footer">
                            Crew Information System - PT Mahardika Adidaya<br/>
                            Report generated on: ${timestamp}
                        </div>
                    </body>
                </html>
            `;
            const projectCodePart = selectedProjectFilter === 'ALL' ? 'ALL' : (selectedProjectFilter.split('-')[1] || selectedProjectFilter);
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const filename = `${projectCodePart}_Crew_Assignment_${dateStr}.pdf`;

            if (onViewDocument) {
                onViewDocument(htmlContent, filename.replace('.pdf', ''));
                return;
            }

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            const customUri = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.copyAsync({ from: uri, to: customUri });
            await Sharing.shareAsync(customUri, { mimeType: 'application/pdf', dialogTitle: 'Crew_Assignments' });
        } catch (error) {
            console.error('Error exporting assignments:', error);
            alert('Failed to export project assignments PDF.');
        }
    };

    useEffect(() => {
        if (onExportRegister) {
            onExportRegister(handleExportAssignment);
        }
    }, [filteredAssignments, selectedProjectFilter, selectedStatusFilter, selectedMonth, onExportRegister]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        // Try parsing YYYY-MM-DD
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const year = parseInt(match[1], 10);
            const monthIdx = parseInt(match[2], 10) - 1;
            const day = parseInt(match[3], 10);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (monthIdx >= 0 && monthIdx < 12) {
                return `${months[monthIdx]} ${day}, ${year}`;
            }
        }
        
        // Fallback
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    // Build project items for SearchablePicker
    const projectItems = useMemo(() => {
        return [
            { id: 'ALL', label: 'All Projects', sublabel: 'ALL' },
            ...projects.map(p => ({
                id: p.code,
                label: p.name,
                sublabel: p.code.split('-')[1] || p.code,
            })),
        ];
    }, [projects]);

    // Build role items for SearchablePicker
    const roleItems = useMemo(() => {
        return ROLE_OPTIONS.map(opt => ({
            id: opt.value,
            label: opt.label,
            sublabel: opt.value === 'ALL' ? 'ALL' : opt.value,
        }));
    }, []);

    // Role & project labels for pills
    const rolePillLabel = selectedRole === 'ALL' ? 'All Roles' : (CREW_ROLE_LABELS[selectedRole as CrewRole] || selectedRole);
    const projectPillLabel = selectedProjectFilter === 'ALL' ? 'All Projects' : (selectedProjectFilter.split('-')[1] || selectedProjectFilter);

    const getOpaqueColor = (hexColor: string, isDarkColor: boolean): string => {
        let cleanHex = hexColor.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
        }
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        
        const alpha = isDarkColor ? 0.14 : 0.08;
        const bgR = isDarkColor ? 28 : 255;
        const bgG = isDarkColor ? 28 : 255;
        const bgB = isDarkColor ? 30 : 255;
        
        const blendedR = Math.round(alpha * r + (1 - alpha) * bgR);
        const blendedG = Math.round(alpha * g + (1 - alpha) * bgG);
        const blendedB = Math.round(alpha * b + (1 - alpha) * bgB);
        
        const hexR = blendedR.toString(16).padStart(2, '0');
        const hexG = blendedG.toString(16).padStart(2, '0');
        const hexB = blendedB.toString(16).padStart(2, '0');
        
        return `#${hexR}${hexG}${hexB}`;
    };

    const getCardBgColor = (filterName: string, iconColor: string) => {
        const isSelected = selectedStatusFilter === filterName;
        if (!isSelected) {
            return isDark ? '#1C1C1E' : '#FFFFFF';
        }
        return isDark ? `${iconColor}45` : `${iconColor}25`;
    };

    const getCardBorderColor = (filterName: string, iconColor: string) => {
        return 'transparent';
    };

    const activeBorderColor = Colors[resolvedTheme].tint;
    const cardBg = isDark ? '#1C1C1E' : '#FFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const chipBg = isDark ? '#1C1C1E' : '#FFF';
    const chipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    // Chip display labels
    const projectLabel = selectedProjectFilter === 'ALL' ? 'Project' : (selectedProjectFilter.split('-')[1] || selectedProjectFilter);
    const statusLabel = selectedStatusFilter === 'ALL' ? 'Status' : (selectedStatusFilter === 'ACTIVE' ? 'Active' : selectedStatusFilter === 'COMPLETED' ? 'Completed' : 'Unassigned');

    const isProjectFiltered = selectedProjectFilter !== 'ALL';
    const isStatusFiltered = selectedStatusFilter !== 'ALL';

    return (
        <View style={s.container}>
            {/* Top Summary Metrics Row - Tappable for filtering */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20, marginBottom: 12 }}
                contentContainerStyle={s.metricsScroll}
            >
                {/* Card 1: Total */}
                <TouchableOpacity
                    style={[s.metricCard, {
                        backgroundColor: getCardBgColor('ALL', '#007AFF'),
                        borderColor: 'transparent',
                        borderWidth: 0,
                    }]}
                    onPress={() => setSelectedRole('ALL')}
                    activeOpacity={0.7}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                            <Ionicons name="briefcase" size={18} color="#007AFF" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{totalAssign}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Total</Text>
                </TouchableOpacity>

                {/* Card 2: Active */}
                <TouchableOpacity
                    style={[s.metricCard, {
                        backgroundColor: getCardBgColor('ACTIVE', '#34C759'),
                        borderColor: 'transparent',
                        borderWidth: 0,
                    }]}
                    onPress={() => handleMetricPress('ACTIVE')}
                    activeOpacity={0.7}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#34C759" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{activeAssign}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Active</Text>
                </TouchableOpacity>

                {/* Card 3: Completed */}
                <TouchableOpacity
                    style={[s.metricCard, {
                        backgroundColor: getCardBgColor('COMPLETED', '#8E8E93'),
                        borderColor: 'transparent',
                        borderWidth: 0,
                    }]}
                    onPress={() => handleMetricPress('COMPLETED')}
                    activeOpacity={0.7}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(142,142,147,0.12)' }]}>
                            <Ionicons name="checkmark-done-circle-outline" size={18} color="#8E8E93" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{completedAssign}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Completed</Text>
                </TouchableOpacity>

                {/* Card 4: Unassigned */}
                <TouchableOpacity
                    style={[s.metricCard, {
                        backgroundColor: getCardBgColor('UNASSIGNED', '#FF9500'),
                        borderColor: 'transparent',
                        borderWidth: 0,
                    }]}
                    onPress={() => handleMetricPress('UNASSIGNED')}
                    activeOpacity={0.7}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
                            <Ionicons name="person-remove" size={18} color="#FF9500" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{unassignedCrewCount}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Unassigned</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ─── Finance-style control row: Project pill + Role pill + Search icon ─── */}
            <View style={s.controlRow}>
                {/* Project pill */}
                <TouchableOpacity
                    style={[s.controlPill, { backgroundColor: cardBg, borderColor: chipBorder }]}
                    onPress={() => setIsProjectPickerVisible(true)}
                    activeOpacity={0.8}
                >
                    <Text style={[s.controlPillText, { color: textColor }]} numberOfLines={1}>
                        {projectPillLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={11} color={subtextColor} style={{ marginLeft: 2 }} />
                </TouchableOpacity>

                {/* Role pill */}
                <TouchableOpacity
                    style={[s.controlPill, { backgroundColor: cardBg, borderColor: chipBorder }]}
                    onPress={() => setIsRolePickerVisible(true)}
                    activeOpacity={0.8}
                >
                    <Text style={[s.controlPillText, { color: textColor }]} numberOfLines={1}>
                        {rolePillLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={11} color={subtextColor} style={{ marginLeft: 2 }} />
                </TouchableOpacity>

                {/* Month pill */}
                <TouchableOpacity
                    style={[s.controlPill, { backgroundColor: cardBg, borderColor: chipBorder }]}
                    onPress={() => setIsMonthPickerVisible(true)}
                    activeOpacity={0.8}
                >
                    <Text style={[s.controlPillText, { color: textColor }]} numberOfLines={1}>
                        {monthPillLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={11} color={subtextColor} style={{ marginLeft: 2 }} />
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                {/* Search icon button */}
                <TouchableOpacity
                    style={[
                        s.searchIconBtn,
                        {
                            backgroundColor: showSearch ? (isDark ? 'rgba(175,82,222,0.15)' : 'rgba(175,82,222,0.1)') : cardBg,
                            borderColor: showSearch ? '#007AFF' : chipBorder,
                        }
                    ]}
                    onPress={() => {
                        setShowSearch(prev => !prev);
                        if (showSearch) setSearch('');
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={showSearch ? 'close' : 'search-outline'}
                        size={16}
                        color={showSearch ? '#007AFF' : textColor}
                    />
                </TouchableOpacity>
            </View>

            {/* Collapsible search bar */}
            {showSearch && (
                <View style={[s.searchBarRow, { backgroundColor: cardBg, borderColor: chipBorder }]}>
                    <Ionicons name="search-outline" size={15} color={subtextColor} style={{ marginRight: 8 }} />
                    <TextInput
                        autoFocus
                        style={[s.searchInput, { color: textColor, flex: 1 }]}
                        placeholder="Search crew by name, role..."
                        placeholderTextColor={subtextColor}
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
                            <Ionicons name="close-circle" size={16} color={subtextColor} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Assignments List */}
            {selectedStatusFilter === 'UNASSIGNED' ? (
                unassignedCrewList.length > 0 ? (
                    <View style={s.listContainer}>
                        {unassignedCrewList.map(member => {
                            // Initials for avatar
                            const nameParts = member.name.split(' ');
                            const initials = nameParts.length >= 2
                                ? nameParts[0][0] + nameParts[1][0]
                                : member.name.slice(0, 2).toUpperCase();

                            return (
                                <TouchableOpacity
                                    key={member.id}
                                    style={[s.assignCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                    onPress={() => onAddAssignment && onAddAssignment(member.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.cardBody}>
                                        {/* Avatar */}
                                        <View style={[s.avatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                            <Text style={[s.avatarText, { color: textColor }]}>{initials}</Text>
                                        </View>

                                        {/* Details */}
                                        <View style={s.details}>
                                            <Text style={[s.name, { color: textColor }]} numberOfLines={1}>
                                                {toTitleCase(member.name)}
                                            </Text>
                                            <View style={s.metadataRow}>
                                                <Text style={[s.roleText, { color: subtextColor }]}>
                                                    {CREW_ROLE_LABELS[member.role as CrewRole]}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Right Section */}
                                        <View style={s.rightSection}>
                                            <View style={[s.statusBadge, { backgroundColor: 'rgba(255,149,0,0.12)' }]}>
                                                <Text style={[s.statusText, { color: '#FF9500' }]}>UNASSIGNED</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <View style={s.emptyState}>
                        <Ionicons name="people-outline" size={48} color={subtextColor} />
                        <Text style={[s.emptyText, { color: subtextColor }]}>All crew members are currently assigned</Text>
                    </View>
                )
            ) : (
                filteredAssignments.length > 0 ? (
                    <View style={s.listContainer}>
                        {filteredAssignments.map(assign => {
                            let statusColor = '#34C759'; // Active
                            let statusBg = 'rgba(52,199,89,0.12)';
                            if (assign.status === 'COMPLETED') {
                                statusColor = '#8E8E93';
                                statusBg = 'rgba(142,142,147,0.12)';
                            } else if (assign.status === 'INACTIVE') {
                                statusColor = '#FF3B30';
                                statusBg = 'rgba(255,59,48,0.12)';
                            }

                            // Initials for avatar
                            const nameParts = assign.crewName.split(' ');
                            const initials = nameParts.length >= 2
                                ? nameParts[0][0] + nameParts[1][0]
                                : assign.crewName.slice(0, 2).toUpperCase();

                            const isSelected = assign.id === selectedAssignmentId;
                            return (
                                <TouchableOpacity
                                    key={assign.id}
                                    style={[
                                        s.assignCard,
                                        { backgroundColor: cardBg, borderColor: cardBorder },
                                        isSelected && {
                                            borderColor: '#8B5CF6',
                                            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
                                            borderWidth: 1.5,
                                        }
                                    ]}
                                    onPress={() => onSelectAssignment(assign)}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.cardBody}>
                                        {/* Avatar */}
                                        <View style={[s.avatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                            <Text style={[s.avatarText, { color: textColor }]}>{initials}</Text>
                                        </View>

                                        {/* Details */}
                                        <View style={s.details}>
                                            <Text style={[s.name, { color: textColor }]} numberOfLines={1}>
                                                {toTitleCase(assign.crewName)}
                                            </Text>
                                            <View style={s.metadataRow}>
                                                <Text style={[s.roleText, { color: subtextColor }]}>
                                                    {CREW_ROLE_LABELS[assign.crewRole]}
                                                </Text>
                                                <View style={[s.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <Text style={[s.projectBadgeText, { color: subtextColor }]}>
                                                        {assign.projectCode.split('-')[1] || assign.projectCode}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={s.periodRow}>
                                                <Text style={[s.periodText, { color: subtextColor }]}>
                                                    {formatDate(assign.startDate)} → {assign.endDate ? formatDate(assign.endDate) : 'Ongoing'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Right Section */}
                                        <View style={s.rightSection}>
                                            <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
                                                <Text style={[s.statusText, { color: statusColor }]}>{assign.status}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <View style={s.emptyState}>
                        <Ionicons name="git-branch-outline" size={48} color={subtextColor} />
                        <Text style={[s.emptyText, { color: subtextColor }]}>No assignments found</Text>
                    </View>
                )
            )}

            {/* Bottom Sheet Pickers */}
            <SearchablePicker
                visible={isProjectPickerVisible}
                onClose={() => setIsProjectPickerVisible(false)}
                onSelect={(item) => setSelectedProjectFilter(item.id)}
                items={projectItems}
                title="Select Project"
                selectedId={selectedProjectFilter}
                tintColor="#007AFF"
            />

            <SearchablePicker
                visible={isRolePickerVisible}
                onClose={() => setIsRolePickerVisible(false)}
                onSelect={(item) => setSelectedRole(item.id as CrewRole | 'ALL')}
                items={roleItems}
                title="Select Role"
                selectedId={selectedRole}
                tintColor="#007AFF"
            />

            <SearchablePicker
                visible={isMonthPickerVisible}
                onClose={() => setIsMonthPickerVisible(false)}
                onSelect={(item) => setSelectedMonth(item.id)}
                items={monthItems}
                title="Select Month"
                selectedId={selectedMonth}
                tintColor="#007AFF"
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    metricsScroll: {
        paddingHorizontal: 20,
        paddingBottom: 0,
        gap: 0,
    },
    metricCard: {
        width: 150,
        height: 110,
        borderRadius: 24,
        borderWidth: 0,
        padding: 16,
        marginRight: 12,
        justifyContent: 'space-between',
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    metricTitle: {
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 16,
    },
    metricSubtitle: {
        fontSize: 11,
        fontWeight: '500',
    },

    // Chip Filter Styles
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    chipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '600',
        maxWidth: 120,
    },
    clearBtn: {
        padding: 4,
    },

    countText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    listContainer: {
        gap: 12,
    },
    assignCard: {
        borderRadius: 24,
        borderWidth: 0,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingLeft: 16,
        paddingRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '800',
    },
    details: {
        flex: 1,
        gap: 3,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    bullet: {
        fontSize: 10,
    },
    projectBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    projectBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    periodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 1,
    },

    periodText: {
        fontSize: 11,
        fontWeight: '500',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 8,
    },
    chevron: {
        marginLeft: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },
    quickAssignBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    quickAssignText: {
        fontSize: 12,
        fontWeight: '700',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        paddingVertical: 0,
    },
    // Finance-style control row
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    controlPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        maxWidth: 100,
    },
    controlPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    typeChipScroll: {
        gap: 6,
        paddingRight: 4,
    },
    typeChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    typeChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    searchIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 14,
        marginBottom: 10,
    },
});
