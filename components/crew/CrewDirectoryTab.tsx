import React, { useState, useMemo, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Platform,
    TextInput,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { CrewMember, CrewRole, CREW_ROLE_LABELS, Project, generateCrewId, Assignment, matchProjectCode } from './mockData';
import * as FileSystem from 'expo-file-system/legacy';
import { SearchablePicker } from '@/components/ui/SearchablePicker';
import { GlassView } from '@/components/ui/GlassView';
import { PillButton } from '@/components/ui/PillButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Safe lazy loading of expo-print and expo-sharing
let Print: any = null;
let Sharing: any = null;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {
    // handled
}

interface CrewDirectoryTabProps {
    crewMembers: CrewMember[];
    projects: Project[];
    assignments?: Assignment[];
    onAddMember: () => void;
    onSelectMember: (member: CrewMember) => void;
    showFilters?: boolean;
    onExportRegister?: (exportFn: () => void) => void;
    onViewDocument?: (html: string, title: string) => void;
    selectedMemberId?: string;
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

export function CrewDirectoryTab({
    crewMembers,
    projects,
    assignments = [],
    onAddMember,
    onSelectMember,
    showFilters = false,
    onExportRegister,
    onViewDocument,
    selectedMemberId,
}: CrewDirectoryTabProps) {
    console.log('[CrewDirectoryTab] Rendering with:', {
        crewMembersCount: crewMembers?.length,
        projectsCount: projects?.length,
        assignmentsCount: assignments?.length
    });
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const insets = useSafeAreaInsets();

    const [isRolePickerVisible, setIsRolePickerVisible] = useState(false);
    const [isProjectPickerVisible, setIsProjectPickerVisible] = useState(false);
    const [isExportOptionsVisible, setIsExportOptionsVisible] = useState(false);

    const [exportFields, setExportFields] = useState({
        id: true,
        role: true,
        projectCode: true,
        phone: true,
        status: true,
        nik: false,
        email: false,
        address: false,
        bank: false,
    });

    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [selectedRole, setSelectedRole] = useState<CrewRole | 'ALL'>('ALL');
    const [selectedProject, setSelectedProject] = useState<string>('ALL');
    const [metricFilter, setMetricFilter] = useState<'ALL' | 'ACTIVE' | 'SKILLED' | 'UNSKILLED' | 'INACTIVE'>('ALL');

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

    // Calculate metrics
    const safeCrewMembers = crewMembers || [];
    const totalCrew = safeCrewMembers.length;
    const activeCrew = safeCrewMembers.filter(c => c.status === 'ACTIVE').length;
    const skilledCrew = safeCrewMembers.filter(c => c.role === 'SKILLED' || c.role === 'FOREMAN' || c.role === 'LEADER').length;
    const helperCrew = safeCrewMembers.filter(c => c.role === 'HELPER' || c.role === 'GENERAL').length;
    const inactiveCrew = safeCrewMembers.filter(c => c.status === 'INACTIVE').length;

    // Filter logic
    const filteredCrew = useMemo(() => {
        return (crewMembers || [])
            .filter(member => {
                const project = projects.find(p => p.code === member.projectCode);
                const projectName = project ? project.name.toLowerCase() : '';
                const projectCode = member.projectCode ? member.projectCode.toLowerCase() : '';
                const projectNum = member.projectCode ? (member.projectCode.split('-')[1] || '').toLowerCase() : '';
                const roleLabel = (CREW_ROLE_LABELS[member.role] || member.role || '').toLowerCase();
                const searchLower = search.toLowerCase();

                const matchesSearch = (member.name || '').toLowerCase().includes(searchLower) ||
                    (member.initials || '').toLowerCase().includes(searchLower) ||
                    (member.phone && member.phone.includes(search)) ||
                    roleLabel.includes(searchLower) ||
                    projectCode.includes(searchLower) ||
                    projectNum.includes(searchLower) ||
                    projectName.includes(searchLower);

                let matchesMetric = true;
                if (metricFilter === 'ACTIVE') {
                    matchesMetric = member.status === 'ACTIVE';
                } else if (metricFilter === 'INACTIVE') {
                    matchesMetric = member.status === 'INACTIVE';
                } else if (metricFilter === 'SKILLED') {
                    matchesMetric = member.role === 'SKILLED' || member.role === 'FOREMAN' || member.role === 'LEADER';
                } else if (metricFilter === 'UNSKILLED') {
                    matchesMetric = member.role === 'HELPER' || member.role === 'GENERAL';
                }

                const matchesRole = selectedRole === 'ALL' || member.role === selectedRole;
                const matchesProject = selectedProject === 'ALL' || matchProjectCode(member.projectCode, selectedProject);

                return matchesSearch && matchesMetric && matchesRole && matchesProject;
            })
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [crewMembers, projects, search, metricFilter, selectedRole, selectedProject]);

    const handleExportDirectory = async () => {
        if (!Print || !Sharing) {
            alert('Export module is not available on this device.');
            return;
        }
        setIsExportOptionsVisible(true);
    };

    const generatePdfExport = async () => {
        try {
            // Build dynamic headers and rows based on exportFields selection
            const columns: { label: string; align?: 'left' | 'center' }[] = [
                { label: 'No', align: 'center' },
                { label: 'Worker Name', align: 'left' }
            ];

            if (exportFields.id) columns.push({ label: 'Crew ID', align: 'left' });
            if (exportFields.role) columns.push({ label: 'Role', align: 'left' });
            if (exportFields.projectCode) columns.push({ label: 'Project', align: 'center' });
            if (exportFields.phone) columns.push({ label: 'Phone', align: 'left' });
            if (exportFields.status) columns.push({ label: 'Status', align: 'center' });
            if (exportFields.nik) columns.push({ label: 'NIK', align: 'left' });
            if (exportFields.email) columns.push({ label: 'Email', align: 'left' });
            if (exportFields.address) columns.push({ label: 'Address', align: 'left' });
            if (exportFields.bank) columns.push({ label: 'Bank Account', align: 'left' });

            const headersHtml = columns.map(col => {
                const alignStyle = col.align ? `text-align: ${col.align};` : '';
                return `<th style="${alignStyle} padding: 10px; background-color: #AF52DE; color: white;">${col.label}</th>`;
            }).join('');

            const rowsHtml = filteredCrew.map((member, idx) => {
                let cells = `
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${member.name}</td>
                `;

                if (exportFields.id) {
                    const crewIdStr = generateCrewId(member, crewMembers, assignments);
                    cells += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${crewIdStr}</td>`;
                }
                if (exportFields.role) {
                    cells += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${CREW_ROLE_LABELS[member.role] || member.role}</td>`;
                }
                if (exportFields.projectCode) {
                    cells += `<td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${member.projectCode || '-'}</td>`;
                }
                if (exportFields.phone) {
                    cells += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.phone || '-'}</td>`;
                }
                if (exportFields.status) {
                    cells += `
                        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">
                            <span style="padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; background-color: ${member.status === 'ACTIVE' ? '#E8F5E9; color: #2E7D32;' : '#FFE0B2; color: #E65100;'}">
                                ${member.status}
                            </span>
                        </td>
                    `;
                }
                if (exportFields.nik) {
                    cells += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.nik || '-'}</td>`;
                }
                if (exportFields.email) {
                    cells += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.email || '-'}</td>`;
                }
                if (exportFields.address) {
                    cells += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${member.homeAddress || '-'}</td>`;
                }
                if (exportFields.bank) {
                    const bankVal = member.bankName && member.bankAccountNumber
                        ? `${member.bankName} (${member.bankAccountNumber})`
                        : '-';
                    cells += `<td style="padding: 8px; border-bottom: 1px solid #ddd;">${bankVal}</td>`;
                }

                return `<tr>${cells}</tr>`;
            }).join('');

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
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
                            th { background-color: #AF52DE; color: white; padding: 10px; text-align: left; }
                            td { padding: 8px 10px; }
                            .footer { margin-top: 35px; font-size: 10px; color: #8E8E93; text-align: center; border-top: 1px solid #E5E5EA; padding-top: 10px; }
                        </style>
                    </head>
                    <body>
                        <h2>PT MAHARDIKA ADIDAYA - CREW DIRECTORY</h2>
                        <div class="meta">
                            Project Filter: ${selectedProject === 'ALL' ? 'All Projects' : selectedProject} | Role Filter: ${selectedRole === 'ALL' ? 'All Roles' : selectedRole} | Total: ${filteredCrew.length} Workers
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    ${headersHtml}
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

            const projectCodePart = selectedProject === 'ALL' ? 'ALL' : (selectedProject.split('-')[1] || selectedProject);
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const filename = `${projectCodePart}_Crew_Directory_${dateStr}.pdf`;

            setIsExportOptionsVisible(false);

            if (onViewDocument) {
                onViewDocument(htmlContent, filename.replace('.pdf', ''));
                return;
            }

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            const customUri = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.copyAsync({ from: uri, to: customUri });
            await Sharing.shareAsync(customUri, { mimeType: 'application/pdf', dialogTitle: 'Crew_Directory' });
        } catch (error) {
            console.error('Error exporting directory:', error);
            alert('Failed to export crew directory PDF.');
        }
    };

    useEffect(() => {
        if (onExportRegister) {
            onExportRegister(handleExportDirectory);
        }
    }, [filteredCrew, selectedProject, selectedRole, onExportRegister]);

    const handleMetricPress = (filterType: 'ALL' | 'ACTIVE' | 'SKILLED' | 'UNSKILLED' | 'INACTIVE') => {
        setMetricFilter(prev => prev === filterType ? 'ALL' : filterType);
    };

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
        const isSelected = metricFilter === filterName;
        if (!isSelected) {
            return isDark ? '#1C1C1E' : '#FFFFFF';
        }
        return isDark ? `${iconColor}45` : `${iconColor}25`;
    };

    const getCardBorderColor = (filterName: string, iconColor: string) => {
        return 'transparent';
    };

    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBorder = 'transparent';
    const activeBorderColor = Colors[resolvedTheme].tint;
    const chipBg = isDark ? '#1C1C1E' : '#FFF';
    const chipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    // Chip display labels
    const roleLabel = selectedRole === 'ALL' ? 'Role' : (CREW_ROLE_LABELS[selectedRole as CrewRole] || selectedRole);
    const projectLabel = selectedProject === 'ALL' ? 'Project' : (selectedProject.split('-')[1] || selectedProject);

    const isRoleFiltered = selectedRole !== 'ALL';
    const isProjectFiltered = selectedProject !== 'ALL';

    // Role & project labels for pills
    const rolePillLabel = selectedRole === 'ALL' ? 'All Roles' : (CREW_ROLE_LABELS[selectedRole as CrewRole] || selectedRole);
    const projectPillLabel = selectedProject === 'ALL' ? 'All Projects' : (selectedProject.split('-')[1] || selectedProject);

    return (
        <View style={s.container}>
            {/* Top Summary Metrics Row - Tappable for filtering */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20, marginBottom: 12 }}
                contentContainerStyle={s.metricsScroll}
            >
                {/* Card 1: Total Crew */}
                <TouchableOpacity
                    style={[s.metricCard, {
                        backgroundColor: getCardBgColor('ALL', '#007AFF'),
                        borderColor: 'transparent',
                        borderWidth: 0,
                    }]}
                    onPress={() => handleMetricPress('ALL')}
                    activeOpacity={0.7}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                            <Ionicons name="people" size={18} color="#007AFF" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{totalCrew}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Total Crew</Text>
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
                        <Text style={[s.metricValue, { color: textColor }]}>{activeCrew}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Active</Text>
                </TouchableOpacity>

                {/* Card 3: Skilled */}
                <TouchableOpacity
                    style={[s.metricCard, {
                        backgroundColor: getCardBgColor('SKILLED', '#007AFF'),
                        borderColor: 'transparent',
                        borderWidth: 0,
                    }]}
                    onPress={() => handleMetricPress('SKILLED')}
                    activeOpacity={0.7}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                            <Ionicons name="star" size={18} color="#007AFF" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{skilledCrew}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Skilled</Text>
                </TouchableOpacity>

                {/* Card 4: Unskilled */}
                <TouchableOpacity
                    style={[s.metricCard, {
                        backgroundColor: getCardBgColor('UNSKILLED', '#FF9500'),
                        borderColor: 'transparent',
                        borderWidth: 0,
                    }]}
                    onPress={() => handleMetricPress('UNSKILLED')}
                    activeOpacity={0.7}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
                            <Ionicons name="hammer" size={18} color="#FF9500" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{helperCrew}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Unskilled</Text>
                </TouchableOpacity>

                {/* Card 5: Inactive */}
                <TouchableOpacity
                    style={[s.metricCard, {
                        backgroundColor: getCardBgColor('INACTIVE', '#8E8E93'),
                        borderColor: 'transparent',
                        borderWidth: 0,
                    }]}
                    onPress={() => handleMetricPress('INACTIVE')}
                    activeOpacity={0.7}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(142,142,147,0.12)' }]}>
                            <Ionicons name="remove-circle-outline" size={18} color="#8E8E93" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{inactiveCrew}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Inactive</Text>
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

                <View style={{ flex: 1 }} />

                {/* Search icon button */}
                <TouchableOpacity
                    style={[
                        s.searchIconBtn,
                        {
                            backgroundColor: showSearch ? (isDark ? 'rgba(175,82,222,0.15)' : 'rgba(175,82,222,0.1)') : cardBg,
                            borderColor: showSearch ? '#AF52DE' : chipBorder,
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
                        color={showSearch ? '#AF52DE' : textColor}
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
                        placeholder="Search by name, role, project..."
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

            {/* Crew List */}
            {filteredCrew.length > 0 ? (
                <View style={s.listContainer}>
                    {filteredCrew.map(member => {
                        const isSelected = member.id === selectedMemberId;
                        return (
                            <TouchableOpacity
                                key={member.id}
                                style={[
                                    s.memberCard,
                                    { backgroundColor: cardBg, borderColor: cardBorder },
                                    isSelected && {
                                        borderColor: '#8B5CF6',
                                        backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
                                        borderWidth: 1.5,
                                    }
                                ]}
                                onPress={() => onSelectMember(member)}
                                activeOpacity={0.7}
                            >
                            <View style={s.cardBody}>
                                {/* Avatar */}
                                <View style={[s.avatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Text style={[s.avatarText, { color: textColor }]}>{member.initials}</Text>
                                </View>

                                {/* Details */}
                                <View style={s.details}>
                                    <Text style={[s.name, { color: textColor }]} numberOfLines={1}>
                                        {member.name}
                                    </Text>
                                    <View style={s.metadataRow}>
                                        <Text style={[s.roleText, { color: subtextColor }]}>
                                            {CREW_ROLE_LABELS[member.role]}
                                        </Text>
                                        {member.projectCode && (
                                            <View style={[s.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                                <Text style={[s.projectBadgeText, { color: subtextColor }]}>
                                                    {member.projectCode.split('-')[1] || member.projectCode}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Right Side: Status Badge */}
                                <View style={s.rightSection}>
                                    <View style={[s.statusBadge, {
                                        backgroundColor: member.status === 'ACTIVE' ? 'rgba(52,199,89,0.12)' : 'rgba(142,142,147,0.12)'
                                    }]}>
                                        <Text style={[s.statusText, {
                                            color: member.status === 'ACTIVE' ? '#34C759' : '#8E8E93'
                                        }]}>
                                            {member.status}
                                        </Text>
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
                    <Text style={[s.emptyText, { color: subtextColor }]}>No crew members found</Text>
                </View>
            )}

            {/* Bottom Sheet Pickers */}
            <SearchablePicker
                visible={isProjectPickerVisible}
                onClose={() => setIsProjectPickerVisible(false)}
                onSelect={(item) => setSelectedProject(item.id)}
                items={projectItems}
                title="Select Project"
                selectedId={selectedProject}
                tintColor="#AF52DE"
            />

            <SearchablePicker
                visible={isRolePickerVisible}
                onClose={() => setIsRolePickerVisible(false)}
                onSelect={(item) => setSelectedRole(item.id as CrewRole | 'ALL')}
                items={roleItems}
                title="Select Role"
                selectedId={selectedRole}
                tintColor="#AF52DE"
            />

            <Modal
                visible={isExportOptionsVisible}
                animationType="slide"
                transparent
                statusBarTranslucent={true}
                onRequestClose={() => setIsExportOptionsVisible(false)}
            >
                <View style={s.overlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setIsExportOptionsVisible(false)}
                    >
                        <View style={{ flex: 1 }} />
                    </TouchableOpacity>

                    <GlassView
                        intensity={60}
                        style={[
                            s.content,
                            {
                                marginTop: insets.top + 40,
                                backgroundColor: Platform.OS === 'android'
                                    ? (isDark ? '#1C1C1E' : '#FFFFFF')
                                    : (isDark ? 'rgba(28,28,30,0.85)' : 'rgba(242,242,247,0.85)')
                            }
                        ]}
                    >
                        <View style={{ flex: 1, padding: 24, paddingBottom: Platform.OS === 'android' ? (insets.bottom > 0 ? insets.bottom + 12 : 24) : Math.max(insets.bottom - 12, 12) }}>

                            {/* Header */}
                            <View style={s.modalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.modalTitle, { color: textColor }]}>Export Columns</Text>
                                    <Text style={{ fontSize: 13, color: subtextColor, marginTop: 4 }}>
                                        Select the data columns you want to include in the PDF report
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setIsExportOptionsVisible(false)}
                                    style={[s.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
                                >
                                    <Ionicons name="close" size={20} color={textColor} />
                                </TouchableOpacity>
                            </View>

                            {/* Options Scroll */}
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
                                <View style={{ gap: 8 }}>
                                    {[
                                        { key: 'id', label: 'Crew ID', desc: 'Show unique worker identification number' },
                                        { key: 'role', label: 'Role', desc: 'Show member role or designation' },
                                        { key: 'projectCode', label: 'Project Code', desc: 'Show current active project code' },
                                        { key: 'phone', label: 'Phone Number', desc: 'Show worker\'s contact phone number' },
                                        { key: 'status', label: 'Active Status', desc: 'Show worker status (ACTIVE/INACTIVE)' },
                                        { key: 'nik', label: 'National ID (NIK)', desc: 'Show national ID card number' },
                                        { key: 'email', label: 'Email Address', desc: 'Show worker\'s registered email address' },
                                        { key: 'address', label: 'Home Address', desc: 'Show residential home address' },
                                        { key: 'bank', label: 'Bank Account Info', desc: 'Show bank name and account number' },
                                    ].map((opt) => {
                                        const isSelected = exportFields[opt.key as keyof typeof exportFields];
                                        return (
                                            <TouchableOpacity
                                                key={opt.key}
                                                onPress={() => {
                                                    setExportFields(prev => ({
                                                        ...prev,
                                                        [opt.key]: !prev[opt.key as keyof typeof exportFields]
                                                    }));
                                                }}
                                                style={[
                                                    s.itemRow,
                                                    isSelected && {
                                                        backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)'
                                                    }
                                                ]}
                                            >
                                                <View style={{ flex: 1, marginRight: 12 }}>
                                                    <Text style={[s.itemLabel, { color: textColor }]}>{opt.label}</Text>
                                                    <Text style={{ fontSize: 11, color: subtextColor, marginTop: 2 }}>{opt.desc}</Text>
                                                </View>
                                                <Ionicons
                                                    name={isSelected ? "checkbox" : "square-outline"}
                                                    size={22}
                                                    color={isSelected ? '#007AFF' : subtextColor}
                                                />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            {/* Actions Footer */}
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                <View style={{ flex: 1 }}>
                                    <TouchableOpacity
                                        onPress={generatePdfExport}
                                        style={{
                                            backgroundColor: '#007AFF',
                                            borderRadius: 999,
                                            paddingVertical: 14,
                                            paddingHorizontal: 20,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shadowColor: '#007AFF',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.2,
                                            shadowRadius: 8,
                                            elevation: 4,
                                        }}
                                    >
                                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                                            Preview PDF
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </GlassView>
                </View>
            </Modal>
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

    // List Styles
    listContainer: {
        gap: 12,
    },
    memberCard: {
        borderRadius: 24,
        borderWidth: 0,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
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
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    chevron: {
        marginLeft: 2,
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
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    content: {
        marginHorizontal: Platform.OS === 'android' ? 0 : 8,
        marginBottom: Platform.OS === 'android' ? 0 : 8,
        borderTopLeftRadius: Platform.OS === 'android' ? 32 : 56,
        borderTopRightRadius: Platform.OS === 'android' ? 32 : 56,
        borderBottomLeftRadius: Platform.OS === 'android' ? 0 : 56,
        borderBottomRightRadius: Platform.OS === 'android' ? 0 : 56,
        overflow: 'hidden',
        height: '72%',
    },
    dragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(142,142,147,0.3)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 4,
    },
    itemLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
});
