import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { GlassView } from '@/components/ui/GlassView';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';
import { Segment, SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeTabWrapper } from '@/components/ui/SwipeTabWrapper';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Stack, useRouter } from 'expo-router';
import { useUserContext, MANAGEMENT_ROLES } from '@/context/UserProvider';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { supabase } from '@/lib/supabase';
import { useMemo, useState, useEffect } from 'react';
import { RefreshControl, Alert, ScrollView, StyleSheet, Text, View, Platform, TextInput, TouchableOpacity, Modal, Share, Linking, ActionSheetIOS, StatusBar as RNStatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearch } from '@/context/SearchContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
// Import extracted components
import { ProfileTab } from '@/components/people/personal/ProfileTab';
import { PerformanceTab } from '@/components/people/personal/PerformanceTab';
import { GrowthTab } from '@/components/people/personal/GrowthTab';
import { ValuesTab } from '@/components/people/personal/ValuesTab';
import { ManagerialDirectoryTab, DirectoryMember } from '@/components/people/managerial/ManagerialDirectoryTab';
import { ManagerialPerformanceTab } from '@/components/people/managerial/ManagerialPerformanceTab';
import { ManagerialSetupTab } from '@/components/people/managerial/ManagerialSetupTab';
import { PeopleSetupDetailPane, SetupModuleId } from '@/app/people-setup/[id]';
import { CrewDocumentPreview } from '@/components/crew/CrewDocumentPreview';
import { SwiftUIExportSheet } from '@/components/people/SwiftUIExportSheet';
import { MemberProfileView } from '@/components/people/member-profile/MemberProfileView';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export type Scope = 'me' | 'team';

const ME_SEGMENTS: Segment[] = [
    { id: 'profile', label: 'Profile', icon: 'person.crop.circle.fill' },
    { id: 'performance', label: 'Performance', icon: 'suitcase.fill' },
    { id: 'growth', label: 'Growth', icon: 'book.fill' },
    { id: 'values', label: 'Values', icon: 'heart.fill' },
];

const TEAM_SEGMENTS: Segment[] = [
    { id: 'directory', label: 'Directory', icon: 'person.2.fill' },
    { id: 'performance_index', label: 'Performance', icon: 'target' },
    { id: 'culture', label: 'Culture', icon: 'sparkles' },
    { id: 'setup', label: 'Setup', icon: 'gearshape.fill' },
];

function ComingSoonCard({ 
    isDark, 
    textColor, 
    subtextColor, 
    title, 
    desc, 
    icon, 
    color 
}: { 
    isDark: boolean; 
    textColor: string; 
    subtextColor: string; 
    title: string; 
    desc: string; 
    icon: string; 
    color: string;
}) {
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    return (
        <GlassView 
            intensity={isDark ? 10 : 25} 
            style={[
                s.comingSoonCard, 
                { 
                    borderColor, 
                    borderWidth: 1,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)'
                }
            ]}
        >
            <View style={s.comingSoonHeader}>
                <View style={[s.comingSoonIconBox, { backgroundColor: `${color}15` }]}>
                    <PlatformIcon name={icon as any} size={24} tintColor={color} />
                </View>
                <View style={[s.comingSoonBadge, { backgroundColor: `${color}15` }]}>
                    <Text style={[s.comingSoonBadgeText, { color }]}>COMING SOON</Text>
                </View>
            </View>
            
            <Text style={[s.comingSoonTitle, { color: textColor }]}>{title}</Text>
            <Text style={[s.comingSoonDesc, { color: subtextColor }]}>{desc}</Text>
            
            {/* Visual preview placeholder to make it look active and high-fidelity */}
            <View style={[s.comingSoonPreview, { borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }]}>
                <View style={s.previewRow}>
                    <View style={[s.previewDot, { backgroundColor: color, opacity: 0.3 }]} />
                    <View style={[s.previewLineShort, { backgroundColor: textColor, opacity: 0.15 }]} />
                </View>
                <View style={s.previewRow}>
                    <View style={[s.previewDot, { backgroundColor: color, opacity: 0.15 }]} />
                    <View style={[s.previewLineLong, { backgroundColor: textColor, opacity: 0.1 }]} />
                </View>
            </View>
        </GlassView>
    );
}

export default function PeopleScreen() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { refreshing, onRefresh } = usePullToRefresh();
    const { resolvedTheme } = useTheme();
    const router = useRouter();
    const { searchQuery, setSearchQuery, setIsSearchVisible, isSearchVisible, setContextAction } = useSearch();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    const { profile, user, isAuthenticated } = useUserContext();
    const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
    const isFocused = useIsFocused();
    const isManager = useMemo(() => profile ? MANAGEMENT_ROLES.includes(profile.role) : false, [profile]);

    // Maintain active scope (Me vs Team)
    const [activeScope, setActiveScope] = useState<Scope>('me');

    // Maintain separate segment states for each scope so switching scopes doesn't lose context
    const [activeMeSegment, setActiveMeSegment] = useState(ME_SEGMENTS[0].id);
    const [activeTeamSegment, setActiveTeamSegment] = useState(TEAM_SEGMENTS[0].id);
    const [selectedMember, setSelectedMember] = useState<DirectoryMember | null>(null);
    const [selectedSetupModule, setSelectedSetupModule] = useState<SetupModuleId>('departments');
    const [meDetailTab, setMeDetailTab] = useState('account');

    // Export feature states
    const [isExportModalVisible, setIsExportModalVisible] = useState(false);
    const [docPreviewVisible, setDocPreviewVisible] = useState(false);
    const [docPreviewHtml, setDocPreviewHtml] = useState<string | null>(null);
    const [docPreviewTitle, setDocPreviewTitle] = useState('');

    const isMe = !isManager || activeScope === 'me';
    const isSystemAccount = (profile as any)?.account_type === 'system';

    useEffect(() => {
        if (isSystemAccount && isMe && activeMeSegment !== 'profile') {
            setActiveMeSegment('profile');
        }
    }, [isSystemAccount, isMe, activeMeSegment]);

    const meSegments = useMemo(() => {
        return ME_SEGMENTS.map((seg) => ({
            ...seg,
            disabled: isSystemAccount && seg.id !== 'profile',
        }));
    }, [isSystemAccount]);

    const currentSegments = isMe ? meSegments : TEAM_SEGMENTS;
    const activeSegment = isMe ? activeMeSegment : activeTeamSegment;
    const setActiveSegment = isMe ? setActiveMeSegment : setActiveTeamSegment;

    const handleExport = async (selectedOptions: Record<string, boolean>) => {
        const p: any = profile || {};
        const isPerformanceTab = activeSegment === 'performance';

        if (isPerformanceTab) {
            // Fetch latest snapshot and team snapshot
            let snap: any = null;
            let teamSnap: any = null;
            try {
                const { data: userSnap } = await supabase
                    .from('people_performance_snapshots')
                    .select('*')
                    .eq('user_id', user?.id || '')
                    .order('period', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (userSnap) {
                    snap = userSnap;
                    if (p.department) {
                        const { data: tSnap } = await supabase
                            .from('team_performance_snapshots')
                            .select('*')
                            .eq('department', p.department)
                            .eq('period', userSnap.period)
                            .maybeSingle();
                        if (tSnap) teamSnap = tSnap;
                    }
                }
            } catch (err) {
                // Ignore
            }

            const overallScore = snap?.computed_index ? Math.round(Number(snap.computed_index)) : 85;
            const periodText = snap?.period || 'Q3 2026';
            const attendanceScore = snap?.attendance_score ? Math.round(Number(snap.attendance_score)) : 94;
            const taskScore = snap?.task_completion_score ? Math.round(Number(snap.task_completion_score)) : 90;
            const projectScore = snap?.project_involvement_score ? Math.round(Number(snap.project_involvement_score)) : 88;
            const qualityScore = snap?.quality_score ? Math.round(Number(snap.quality_score)) : 92;
            const peerScore = snap?.peer_review_score ? Math.round(Number(snap.peer_review_score)) : 89;

            const avgAttendance = teamSnap?.avg_attendance_score ? Math.round(Number(teamSnap.avg_attendance_score)) : 85;
            const avgTask = teamSnap?.avg_task_completion_score ? Math.round(Number(teamSnap.avg_task_completion_score)) : 82;
            const avgProject = teamSnap?.avg_project_involvement_score ? Math.round(Number(teamSnap.avg_project_involvement_score)) : 80;
            const avgQuality = teamSnap?.avg_quality_score ? Math.round(Number(teamSnap.avg_quality_score)) : 85;
            const avgPeer = teamSnap?.avg_peer_review_score ? Math.round(Number(teamSnap.avg_peer_review_score)) : 80;

            let htmlContent = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            * { box-sizing: border-box; }
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                                padding: 32px; 
                                color: #1C1C1E; 
                                background-color: #FFFFFF;
                                margin: 0;
                            }
                            .header { 
                                text-align: center; 
                                border-bottom: 2px solid #007AFF; 
                                padding-bottom: 20px; 
                                margin-bottom: 24px; 
                            }
                            .logo { 
                                font-size: 22px; 
                                font-weight: 800; 
                                color: #007AFF; 
                                letter-spacing: -0.5px; 
                            }
                            .title { 
                                font-size: 13px; 
                                font-weight: 600; 
                                color: #8E8E93; 
                                margin-top: 4px; 
                                text-transform: uppercase; 
                                letter-spacing: 1px; 
                            }
                            .user-card {
                                background-color: #F2F2F7;
                                border-radius: 12px;
                                padding: 16px 20px;
                                margin-bottom: 24px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            }
                            .user-info h2 {
                                margin: 0 0 4px 0;
                                font-size: 18px;
                                color: #1C1C1E;
                            }
                            .user-info p {
                                margin: 0;
                                font-size: 13px;
                                color: #8E8E93;
                            }
                            .score-banner {
                                text-align: right;
                            }
                            .score-num {
                                font-size: 32px;
                                font-weight: 800;
                                color: #007AFF;
                                line-height: 1;
                            }
                            .score-sub {
                                font-size: 11px;
                                font-weight: 700;
                                color: #8E8E93;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            }
                            .section { 
                                margin-bottom: 24px; 
                            }
                            .section-title { 
                                font-size: 12px; 
                                font-weight: 800; 
                                color: #007AFF; 
                                border-bottom: 1px solid #E5E5EA; 
                                padding-bottom: 6px; 
                                margin-bottom: 12px; 
                                text-transform: uppercase; 
                                letter-spacing: 0.5px; 
                            }
                            .metric-table {
                                width: 100%;
                                border-collapse: collapse;
                            }
                            .metric-table th {
                                text-align: left;
                                font-size: 11px;
                                font-weight: 700;
                                color: #8E8E93;
                                text-transform: uppercase;
                                padding: 8px 10px;
                                border-bottom: 1px solid #E5E5EA;
                            }
                            .metric-table td {
                                padding: 10px;
                                font-size: 14px;
                                border-bottom: 1px solid #F2F2F7;
                            }
                            .score-bar-bg {
                                background: #E5E5EA;
                                border-radius: 4px;
                                height: 8px;
                                width: 120px;
                                overflow: hidden;
                                display: inline-block;
                                vertical-align: middle;
                                margin-right: 8px;
                            }
                            .score-bar-fill {
                                background: #007AFF;
                                height: 100%;
                                border-radius: 4px;
                            }
                            .tag-badge {
                                display: inline-block;
                                padding: 3px 8px;
                                border-radius: 6px;
                                font-size: 11px;
                                font-weight: 700;
                                background: rgba(0,122,255,0.1);
                                color: #007AFF;
                            }
                            .footer { 
                                text-align: center; 
                                font-size: 11px; 
                                color: #8E8E93; 
                                margin-top: 40px; 
                                border-top: 1px solid #E5E5EA; 
                                padding-top: 16px; 
                                line-height: 1.4; 
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="logo">PT MAHARDIKA ADIDAYA</div>
                            <div class="title">Performance Assessment Report</div>
                        </div>

                        <div class="user-card">
                            <div class="user-info">
                                <h2>${p.full_name || p.nickname || 'Employee'}</h2>
                                <p>${p.role ? p.role.toUpperCase() : 'MEMBER'} &bull; ${p.department || 'Creative Development'} &bull; ID: ${p.id_number || '-'}</p>
                            </div>
                            ${selectedOptions.overallIndex ? `
                            <div class="score-banner">
                                <div class="score-num">${overallScore}</div>
                                <div class="score-sub">Overall Index</div>
                            </div>` : ''}
                        </div>
            `;

            if (selectedOptions.periodInfo) {
                htmlContent += `
                    <div class="section">
                        <div class="section-title">Evaluation Timeline</div>
                        <table class="metric-table">
                            <tr><td><strong>Assessment Period</strong></td><td style="text-align: right;"><span class="tag-badge">${periodText}</span></td></tr>
                            <tr><td><strong>Assessment Date</strong></td><td style="text-align: right;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>
                            <tr><td><strong>Department Benchmark</strong></td><td style="text-align: right;">${p.department || 'Studio Team'} Standard</td></tr>
                        </table>
                    </div>
                `;
            }

            htmlContent += `
                <div class="section">
                    <div class="section-title">Key Performance Indicators</div>
                    <table class="metric-table">
                        <thead>
                            <tr>
                                <th>Metric Category</th>
                                <th>Individual Score</th>
                                ${selectedOptions.teamBenchmark ? '<th>Team Avg (KKM)</th>' : ''}
                                <th style="text-align: right;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (selectedOptions.attendance) {
                htmlContent += `
                    <tr>
                        <td><strong>Attendance & Punctuality</strong><br/><span style="font-size: 11px; color: #8E8E93;">Log regularity & presence</span></td>
                        <td>
                            <span class="score-bar-bg"><span class="score-bar-fill" style="width: ${attendanceScore}%;"></span></span>
                            <strong>${attendanceScore}%</strong>
                        </td>
                        ${selectedOptions.teamBenchmark ? `<td>${avgAttendance}%</td>` : ''}
                        <td style="text-align: right;"><span class="tag-badge">${attendanceScore >= avgAttendance ? 'Passed' : 'Review'}</span></td>
                    </tr>
                `;
            }

            if (selectedOptions.taskCompletion) {
                htmlContent += `
                    <tr>
                        <td><strong>Task Completion & Velocity</strong><br/><span style="font-size: 11px; color: #8E8E93;">Task delivery & volume</span></td>
                        <td>
                            <span class="score-bar-bg"><span class="score-bar-fill" style="width: ${taskScore}%;"></span></span>
                            <strong>${taskScore}%</strong>
                        </td>
                        ${selectedOptions.teamBenchmark ? `<td>${avgTask}%</td>` : ''}
                        <td style="text-align: right;"><span class="tag-badge">${taskScore >= avgTask ? 'Passed' : 'Review'}</span></td>
                    </tr>
                `;
            }

            if (selectedOptions.projectInvolvement) {
                htmlContent += `
                    <tr>
                        <td><strong>Project Involvement</strong><br/><span style="font-size: 11px; color: #8E8E93;">Cross-functional support</span></td>
                        <td>
                            <span class="score-bar-bg"><span class="score-bar-fill" style="width: ${projectScore}%;"></span></span>
                            <strong>${projectScore}%</strong>
                        </td>
                        ${selectedOptions.teamBenchmark ? `<td>${avgProject}%</td>` : ''}
                        <td style="text-align: right;"><span class="tag-badge">${projectScore >= avgProject ? 'Passed' : 'Review'}</span></td>
                    </tr>
                `;
            }

            if (selectedOptions.taskQuality) {
                htmlContent += `
                    <tr>
                        <td><strong>Task Quality Standards</strong><br/><span style="font-size: 11px; color: #8E8E93;">Deliverable QA & precision</span></td>
                        <td>
                            <span class="score-bar-bg"><span class="score-bar-fill" style="width: ${qualityScore}%;"></span></span>
                            <strong>${qualityScore}%</strong>
                        </td>
                        ${selectedOptions.teamBenchmark ? `<td>${avgQuality}%</td>` : ''}
                        <td style="text-align: right;"><span class="tag-badge">${qualityScore >= avgQuality ? 'Passed' : 'Review'}</span></td>
                    </tr>
                `;
            }

            if (selectedOptions.peerReview) {
                htmlContent += `
                    <tr>
                        <td><strong>Peer & Manager Review</strong><br/><span style="font-size: 11px; color: #8E8E93;">360 collaboration feedback</span></td>
                        <td>
                            <span class="score-bar-bg"><span class="score-bar-fill" style="width: ${peerScore}%;"></span></span>
                            <strong>${peerScore}%</strong>
                        </td>
                        ${selectedOptions.teamBenchmark ? `<td>${avgPeer}%</td>` : ''}
                        <td style="text-align: right;"><span class="tag-badge">${peerScore >= avgPeer ? 'Passed' : 'Review'}</span></td>
                    </tr>
                `;
            }

            htmlContent += `
                        </tbody>
                    </table>
                </div>

                <div class="footer">
                    Adidaya People Analytics - PT Mahardika Adidaya<br/>
                    Generated on: ${new Date().toLocaleString()}
                </div>
                </body>
                </html>
            `;

            setIsExportModalVisible(false);
            setDocPreviewHtml(htmlContent);
            setDocPreviewTitle(`Adidaya_Performance_${p.id_number || 'Report'}`);
            setDocPreviewVisible(true);
            return;
        }

        // Profile Export Logic
        let htmlContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        * { box-sizing: border-box; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                            padding: 32px; 
                            color: #1C1C1E; 
                            background-color: #FFFFFF;
                            margin: 0;
                        }
                        .header { 
                            text-align: center; 
                            border-bottom: 2px solid #007AFF; 
                            padding-bottom: 20px; 
                            margin-bottom: 28px; 
                        }
                        .logo { 
                            font-size: 22px; 
                            font-weight: 800; 
                            color: #007AFF; 
                            letter-spacing: -0.5px; 
                        }
                        .title { 
                            font-size: 13px; 
                            font-weight: 600; 
                            color: #8E8E93; 
                            margin-top: 4px; 
                            text-transform: uppercase; 
                            letter-spacing: 1px; 
                        }
                        .section { 
                            margin-bottom: 24px; 
                        }
                        .section-title { 
                            font-size: 12px; 
                            font-weight: 800; 
                            color: #007AFF; 
                            border-bottom: 1px solid #E5E5EA; 
                            padding-bottom: 6px; 
                            margin-bottom: 12px; 
                            text-transform: uppercase; 
                            letter-spacing: 0.5px; 
                        }
                        .row { 
                            display: flex; 
                            justify-content: space-between; 
                            align-items: center; 
                            padding: 9px 0; 
                            border-bottom: 1px solid #F2F2F7; 
                            font-size: 14px; 
                        }
                        .label { 
                            font-weight: 600; 
                            color: #8E8E93; 
                            text-transform: uppercase; 
                            font-size: 11px; 
                            letter-spacing: 0.5px; 
                        }
                        .value { 
                            color: #1C1C1E; 
                            font-weight: 500; 
                        }
                        .value-mono { 
                            font-family: Courier, monospace; 
                            color: #007AFF; 
                            font-weight: bold; 
                        }
                        .footer { 
                            text-align: center; 
                            font-size: 11px; 
                            color: #8E8E93; 
                            margin-top: 40px; 
                            border-top: 1px solid #E5E5EA; 
                            padding-top: 16px; 
                            line-height: 1.4; 
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">PT MAHARDIKA ADIDAYA</div>
                        <div class="title">Personal Profile Report</div>
                    </div>
        `;
        
        if (selectedOptions.identity) {
            htmlContent += `
                <div class="section">
                    <div class="section-title">Personal Identity</div>
                    <div class="row"><div class="label">Full Name</div><div class="value">${p.full_name || '-'}</div></div>
                    <div class="row"><div class="label">Nickname</div><div class="value">${p.nickname || '-'}</div></div>
                    <div class="row"><div class="label">Birthday</div><div class="value">${p.birthday || '-'}</div></div>
                    <div class="row"><div class="label">National ID (NIK)</div><div class="value">${p.nik || '-'}</div></div>
                    <div class="row"><div class="label">Personal Email</div><div class="value">${p.social_links?.personal_email || '-'}</div></div>
                    <div class="row"><div class="label">WhatsApp</div><div class="value">${p.phone || '-'}</div></div>
                    <div class="row"><div class="label">Alternative Phone</div><div class="value">${p.social_links?.phone_number || '-'}</div></div>
                </div>
            `;
        }
        
        if (selectedOptions.address) {
            htmlContent += `
                <div class="section">
                    <div class="section-title">Address Details</div>
                    <div class="row"><div class="label">Current Residence</div><div class="value">${p.address?.current || '-'}</div></div>
                    <div class="row"><div class="label">KTP Address</div><div class="value">${p.address?.ktp || '-'}</div></div>
                </div>
            `;
        }

        if (selectedOptions.emergency) {
            htmlContent += `
                <div class="section">
                    <div class="section-title">Emergency Contact</div>
                    <div class="row"><div class="label">Contact Name</div><div class="value">${p.emergency_contact?.name || '-'}</div></div>
                    <div class="row"><div class="label">Relationship</div><div class="value">${p.emergency_contact?.relationship || '-'}</div></div>
                    <div class="row"><div class="label">Phone Number</div><div class="value">${p.emergency_contact?.phone || '-'}</div></div>
                </div>
            `;
        }

        if (selectedOptions.social) {
            htmlContent += `
                <div class="section">
                    <div class="section-title">Social Profiles</div>
                    <div class="row"><div class="label">LinkedIn</div><div class="value">${p.social_links?.linkedin || '-'}</div></div>
                    <div class="row"><div class="label">Instagram</div><div class="value">${p.social_links?.instagram || '-'}</div></div>
                </div>
            `;
        }

        if (selectedOptions.employment) {
            htmlContent += `
                <div class="section">
                    <div class="section-title">Employment Details</div>
                    <div class="row"><div class="label">Employee ID</div><div class="value">${p.id_number || '-'}</div></div>
                    <div class="row"><div class="label">ID Code</div><div class="value-mono">${p.id_code || '-'}</div></div>
                    <div class="row"><div class="label">Department</div><div class="value">${p.department || '-'}</div></div>
                    <div class="row"><div class="label">Position</div><div class="value" style="text-transform: capitalize;">${p.role || '-'}</div></div>
                    <div class="row"><div class="label">Join Date</div><div class="value">${p.join_date || '-'}</div></div>
                </div>
            `;
        }
        
        if (selectedOptions.access) {
            htmlContent += `
                <div class="section">
                    <div class="section-title">Access & Security</div>
                    <div class="row"><div class="label">System Role</div><div class="value">${p.role ? p.role.toUpperCase() : '-'}</div></div>
                    <div class="row"><div class="label">Assignment Status</div><div class="value">${p.id ? 'Active' : '-'}</div></div>
                </div>
            `;
        }

        if (selectedOptions.account) {
            htmlContent += `
                <div class="section">
                    <div class="section-title">Account Info</div>
                    <div class="row"><div class="label">Username</div><div class="value">${p.username || '-'}</div></div>
                    <div class="row"><div class="label">Account Type</div><div class="value">${p.account_type || '-'}</div></div>
                </div>
            `;
        }

        if (selectedOptions.finance) {
            htmlContent += `
                <div class="section">
                    <div class="section-title">Finance & Banking</div>
                    <div class="row"><div class="label">Bank Name</div><div class="value">${p.bank_info?.bank_name || '-'}</div></div>
                    <div class="row"><div class="label">Account Number</div><div class="value">${p.bank_info?.account_number || '-'}</div></div>
                    <div class="row"><div class="label">Account Holder</div><div class="value">${p.bank_info?.account_holder || '-'}</div></div>
                </div>
            `;
        }

        if (selectedOptions.documents) {
            let userDocs: any[] = [];
            try {
                const { data: docs } = await supabase
                    .from('user_documents')
                    .select('*')
                    .eq('user_id', p.id || '');
                if (docs) userDocs = docs;
            } catch (err) {
                // Ignore
            }

            htmlContent += `
                <div class="section">
                    <div class="section-title">Uploaded Documents</div>
            `;
            if (userDocs.length > 0) {
                userDocs.forEach(doc => {
                    htmlContent += `
                        <div class="row"><div class="label">${doc.category || 'Document'}</div><div class="value">${doc.title || doc.name || 'Uploaded'}</div></div>
                    `;
                });
            } else {
                htmlContent += `
                    <div class="row"><div class="label">Documents Status</div><div class="value">No documents on file</div></div>
                `;
            }
            htmlContent += `</div>`;
        }
        
        htmlContent += `
                    <div class="footer">
                        Adidaya Personal Profile Service - PT Mahardika Adidaya<br/>
                        Generated on: ${new Date().toLocaleString()}
                    </div>
                </body>
            </html>
        `;

        setIsExportModalVisible(false);
        setDocPreviewHtml(htmlContent);
        setDocPreviewTitle(`Adidaya_Profile_${p.id_number || 'Report'}`);
        setDocPreviewVisible(true);
    };

    const handleActionUploadDoc = async (category: string) => {
        if (!profile?.id) return;
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (res.canceled || !res.assets || res.assets.length === 0) return;
            const asset = res.assets[0];

            // Read as base64
            const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64
            });

            const fileExt = asset.name.split('.').pop() || 'bin';
            const fileName = `${profile.id}/${category}-${Date.now()}.${fileExt}`;

            // Upload to Supabase bucket 'profile_documents'
            const { error: uploadError } = await supabase.storage
                .from('profile_documents')
                .upload(fileName, decode(base64Data), {
                    contentType: asset.mimeType || 'application/octet-stream',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('profile_documents')
                .getPublicUrl(fileName);

            // Fetch existing documents from user_documents to decide update vs insert
            const { data: userDocs } = await supabase
                .from('user_documents')
                .select('*')
                .eq('user_id', profile.id);

            const existingDoc = userDocs?.find((d: any) => (d.document_type || d.category) === category);
            if (existingDoc) {
                const { error: dbError } = await supabase
                    .from('user_documents')
                    .update({
                        title: asset.name,
                        file_url: publicUrlData.publicUrl,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingDoc.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase
                    .from('user_documents')
                    .insert({
                        user_id: profile.id,
                        title: asset.name,
                        document_type: category,
                        file_url: publicUrlData.publicUrl,
                    });
                if (dbError) throw dbError;
            }

            if (category === 'Pas Foto') {
                await supabase
                    .from('profiles')
                    .update({ avatar_url: publicUrlData.publicUrl })
                    .eq('id', profile.id);
            }

            Alert.alert('Success', `${category} uploaded successfully.`);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to upload document');
        }
    };

    const actions = useMemo(() => {
        if (!isAuthenticated) return [];
        const baseActions: HeaderToolbarAction[] = [];

        // 1. Scope Toggle (Team / Personal)
        if (isManager) {
            baseActions.push({
                id: 'scope',
                icon: (isMe ? 'person' : 'people') as any,
                image: isMe ? 'person.fill' : 'person.2.fill',
                tintColor: textColor,
                onPress: () => setActiveScope(prev => prev === 'me' ? 'team' : 'me'),
                title: isMe ? 'Personal View' : 'Team View'
            });
        }

        // 2. Export Button
        baseActions.push({
            id: 'export',
            icon: 'share-outline' as any,
            image: 'square.and.arrow.up',
            tintColor: textColor,
            onPress: () => setIsExportModalVisible(true),
            title: 'Export Data'
        });

        // 3. Add (+) Button - only visible on Directory tab
        if (activeSegment === 'directory') {
            baseActions.push({
                id: 'add',
                icon: 'add' as any,
                image: 'plus',
                isPrimary: true,
                tintColor: '#FFFFFF',
                onPress: () => {
                    router.push('/organization-settings/team');
                },
                title: 'Add Team Member'
            });
        }

        return baseActions;
    }, [isMe, textColor, isManager, router, activeSegment]);

    useEffect(() => {
        if (isFocused && isMe && (activeSegment === 'profile' || activeSegment === 'performance')) {
            setContextAction({
                label: 'Add',
                icon: 'add-outline',
                sfIcon: 'plus',
                action: () => setIsActionSheetVisible(true),
                options: [
                    {
                        label: 'Upload Document',
                        icon: 'document-text-outline',
                        sfIcon: 'document.text.fill',
                        description: 'Upload NPWP, KTP, CV, or diploma file',
                        action: () => {
                            setTimeout(() => {
                                Alert.alert(
                                    'Select Category',
                                    'Choose document type:',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Pas Foto (Profile Photo)', onPress: () => handleActionUploadDoc('Pas Foto') },
                                        { text: 'KTP (National ID)', onPress: () => handleActionUploadDoc('KTP') },
                                        { text: 'NPWP (Tax ID)', onPress: () => handleActionUploadDoc('NPWP') },
                                        { text: 'CV / Resume', onPress: () => handleActionUploadDoc('CV') },
                                        { text: 'Ijazah / Diploma', onPress: () => handleActionUploadDoc('Diploma') }
                                    ]
                                );
                            }, 100);
                        }
                    },
                    {
                        label: 'Edit Contact Info',
                        icon: 'create-outline',
                        sfIcon: 'pencil.circle.fill',
                        description: 'Update WhatsApp, email, nickname, and socials',
                        action: () => {
                            router.push('/profile-details/identity');
                        }
                    },
                    {
                        label: 'Request Data Change',
                        icon: 'shield-checkmark-outline',
                        sfIcon: 'lock.shield.fill',
                        description: 'Ask HR to edit locked bank account or official records',
                        action: () => {
                            Alert.alert(
                                'Request Data Change',
                                'To request changes to locked profile records (such as Legal Name, Employee ID, position, or bank details), please submit a request to HR.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { 
                                        text: 'Email HR', 
                                        onPress: () => {
                                            Linking.openURL('mailto:admin@adidayastudio.id?subject=Request%20Data%20Change&body=Name:%20' + (profile?.full_name || '') + '%0D%0AEmployee%20ID:%20' + (profile?.id_number || '') + '%0D%0A%0D%0ADesired%20Change:');
                                        }
                                    }
                                ]
                            );
                        }
                    }
                ]
            });
        } else {
            setContextAction(null);
        }
    }, [isFocused, isMe, activeSegment, profile, setContextAction]);

    const handleSegmentChange = (id: string) => {
        setActiveSegment(id);
    };

    return (
        <>
            <Stack.Screen options={{
                headerShown: Platform.OS !== 'web',
                title: 'People',
                headerLargeTitle: Platform.OS === 'ios',
                headerTransparent: Platform.OS === 'ios',
                headerTintColor: textColor,
                headerShadowVisible: false,
                headerStyle: Platform.OS === 'ios'
                    ? { backgroundColor: 'transparent' }
                    : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                headerLargeStyle: Platform.OS === 'ios'
                    ? { backgroundColor: 'transparent' }
                    : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                headerLargeTitleStyle: { fontSize: 26, color: textColor },
                headerLeft: () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: Platform.OS === 'web' ? 16 : 0 }}>
                        <HeaderCircleButton
                            type="back"
                            onPress={() => router.back()}
                            isDark={isDark}
                            size={36}
                        />
                    </View>
                ),
                headerRight: (isAuthenticated && actions.length > 0) ? () => (
                    <HeaderToolbar
                        actions={actions}
                        isDark={isDark}
                        textColor={textColor}
                        maxDirectActions={3}
                    />
                ) : undefined,
            }} />

            {Platform.OS === 'web' && !isDesktopWeb && (
                <WebFinderHeader
                    title="People"
                    showBack
                    actions={isAuthenticated ? actions : undefined}
                    centerComponent={
                        <SegmentedControl
                            segments={currentSegments}
                            activeSegment={activeSegment}
                            onSegmentChange={handleSegmentChange}
                        />
                    }
                />
            )}

            {isDesktopWeb ? (
                <View style={[s.splitRoot, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    {/* Left Pane (flex: 1.1) */}
                    <View style={[s.splitLeftPane, { borderRightColor: borderColor }]}>
                        {/* Header with Title + Action Buttons */}
                        <View style={s.splitListHeader}>
                            <View style={s.splitListHeaderTitleRow}>
                                <Text style={[s.splitListHeaderTitle, { color: textColor }]}>People</Text>
                                {isAuthenticated && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {isManager && (
                                            <TouchableOpacity
                                                onPress={() => setActiveScope(prev => prev === 'me' ? 'team' : 'me')}
                                                style={[s.headerActionCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                            >
                                                <PlatformIcon
                                                    name={isMe ? 'person.fill' : 'person.2.fill'}
                                                    size={16}
                                                    tintColor={textColor}
                                                />
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            onPress={() => setIsExportModalVisible(true)}
                                            style={[s.headerActionCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                        >
                                            <Ionicons name="share-outline" size={16} color={textColor} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (activeSegment === 'directory') {
                                                    router.push('/organization-settings/team');
                                                } else {
                                                    setIsActionSheetVisible(true);
                                                }
                                            }}
                                            style={[s.headerActionCircle, { backgroundColor: '#1677D2' }]}
                                        >
                                            <Ionicons name="add" size={18} color="#FFFFFF" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Filter Segmented Control */}
                            <View style={{ marginTop: 12 }}>
                                <SegmentedControl
                                    fullWidth
                                    style={{ width: '100%' }}
                                    segments={currentSegments}
                                    activeSegment={activeSegment}
                                    onSegmentChange={handleSegmentChange}
                                />
                            </View>
                        </View>

                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 60 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {!isAuthenticated ? (
                                <UnauthenticatedView
                                    compact
                                    title={`People — ${currentSegments.find(s => s.id === activeSegment)?.label || 'Directory'}`}
                                    description="Sign in to your organization workspace to access employee directories, team roles, performance reviews, and organizational charts."
                                    buttonText="Sign In"
                                />
                            ) : !isMe ? (
                                <>
                                    {activeTeamSegment === 'directory' && (
                                        <ManagerialDirectoryTab 
                                            isDark={isDark} 
                                            textColor={textColor} 
                                            subtextColor={subtextColor} 
                                            selectedMemberId={selectedMember?.user_id || selectedMember?.id}
                                            onSelectMember={setSelectedMember}
                                            onMembersLoaded={(members) => {
                                                if (!selectedMember && members.length > 0) {
                                                    setSelectedMember(members[0]);
                                                }
                                            }}
                                        />
                                    )}
                                    {activeTeamSegment === 'performance_index' && (
                                        <ManagerialPerformanceTab
                                            isDark={isDark}
                                            textColor={textColor}
                                            subtextColor={subtextColor}
                                        />
                                    )}
                                    {activeTeamSegment === 'culture' && (
                                        <ComingSoonCard
                                            isDark={isDark}
                                            textColor={textColor}
                                            subtextColor={subtextColor}
                                            title="Company Culture & Values"
                                            desc="Track team culture engagement, recognition, core values adoption, and culture awards."
                                            icon="sparkles"
                                            color="#AF52DE"
                                        />
                                    )}
                                    {activeTeamSegment === 'setup' && (
                                        <ManagerialSetupTab
                                            isDark={isDark}
                                            textColor={textColor}
                                            subtextColor={subtextColor}
                                            selectedModule={selectedSetupModule}
                                            onSelectModule={setSelectedSetupModule}
                                        />
                                    )}
                                </>
                            ) : (
                                <>
                                    {activeMeSegment === 'profile' && (
                                        <ProfileTab
                                            isDark={isDark}
                                            textColor={textColor}
                                            subtextColor={subtextColor}
                                            activeTab={meDetailTab}
                                            onSelectTab={(tabId) => {
                                                setMeDetailTab(tabId);
                                            }}
                                        />
                                    )}
                                    {activeMeSegment === 'performance' && (
                                        <PerformanceTab
                                            isDark={isDark}
                                            textColor={textColor}
                                            subtextColor={subtextColor}
                                        />
                                    )}
                                    {activeMeSegment === 'growth' && (
                                        <GrowthTab
                                            isDark={isDark}
                                            textColor={textColor}
                                            subtextColor={subtextColor}
                                        />
                                    )}
                                    {activeMeSegment === 'values' && (
                                        <ValuesTab
                                            isDark={isDark}
                                            textColor={textColor}
                                            subtextColor={subtextColor}
                                        />
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                    <View style={s.splitRightPane}>
                        {isAuthenticated && !isMe && activeTeamSegment === 'setup' ? (
                            <PeopleSetupDetailPane moduleId={selectedSetupModule} onModuleChange={setSelectedSetupModule} />
                        ) : isAuthenticated && selectedMember ? (
                            <MemberProfileView 
                                params={{
                                    id: selectedMember.user_id || selectedMember.id,
                                    name: selectedMember.name,
                                    dept: selectedMember.dept,
                                    role: selectedMember.role,
                                    status: selectedMember.status,
                                    email: selectedMember.email,
                                }}
                                isEmbedded={true}
                                onClose={() => setSelectedMember(null)}
                            />
                        ) : isMe && user ? (
                            <MemberProfileView
                                key={user.id}
                                params={{
                                    id: user.id,
                                    name: profile?.full_name || 'Member',
                                    dept: (profile as any)?.department || 'Team',
                                    role: profile?.role || 'member',
                                    status: 'active',
                                    email: user.email || '',
                                }}
                                isEmbedded={true}
                                controlledTab={meDetailTab}
                                onTabChange={setMeDetailTab}
                            />
                        ) : (
                            <View style={s.desktopEmptyPane}>
                                <View style={[s.desktopEmptyIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                    <PlatformIcon name="person.crop.circle" size={44} tintColor={subtextColor} />
                                </View>
                                <Text style={[s.desktopEmptyTitle, { color: textColor }]}>Select a Team Member</Text>
                                <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                                    Choose a member from the directory to inspect profile, employment records, and documents.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <SwipeTabWrapper segments={currentSegments} activeSegment={activeSegment} onSegmentChange={handleSegmentChange}>
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
                    contentInsetAdjustmentBehavior="automatic"
                    style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? 'transparent' : (isDark ? '#000' : '#F2F2F7') }}
                    contentContainerStyle={{ paddingBottom: 120, paddingTop: 0 }}
                    showsVerticalScrollIndicator={false}
                    stickyHeaderIndices={Platform.OS === 'android' ? [0] : undefined}
                >
                    {/* Index 0: Sticky Segmented Control Wrapper for Native Only */}
                    {Platform.OS !== 'web' && (
                        <View style={{
                            width: '100%',
                            alignItems: 'flex-start',
                            paddingTop: 6,
                            paddingBottom: 6,
                            paddingHorizontal: 16,
                            zIndex: 10,
                        }}>
                            <SegmentedControl
                                segments={currentSegments}
                                activeSegment={activeSegment}
                                onSegmentChange={handleSegmentChange}
                            />
                        </View>
                    )}

                    {/* Index 2: Rest of Content */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                        {isSearchVisible && (
                            <Animated.View
                                entering={FadeInUp}
                                style={[
                                    s.inlineSearchContainer,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                    }
                                ]}
                            >
                                <Ionicons name="search" size={18} color={subtextColor} style={{ marginRight: 8 }} />
                                <TextInput
                                    placeholder="Search people..."
                                    placeholderTextColor={isDark ? '#666' : '#999'}
                                    style={[s.inlineSearchInput, { color: textColor }]}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    returnKeyType="search"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4, marginRight: 4 }}>
                                        <Ionicons name="close-circle" size={18} color={subtextColor} />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsSearchVisible(false);
                                        setSearchQuery('');
                                    }}
                                    style={s.inlineCancelButton}
                                >
                                    <Text style={{ color: subtextColor, fontWeight: '500', fontSize: 15 }}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        {!isAuthenticated ? (
                            <UnauthenticatedView
                                compact
                                title={`People — ${currentSegments.find(s => s.id === activeSegment)?.label || 'Directory'}`}
                                description="Sign in to your organization workspace to access employee directories, team roles, performance reviews, and organizational charts."
                                buttonText="Sign In"
                            />
                        ) : isMe ? (
                            activeSegment === 'profile' ? <ProfileTab isDark={isDark} textColor={textColor} subtextColor={subtextColor} />
                                : activeSegment === 'performance' ? <PerformanceTab isDark={isDark} textColor={textColor} subtextColor={subtextColor} />
                                    : activeSegment === 'growth' ? (
                                        <ComingSoonCard 
                                            isDark={isDark} 
                                            textColor={textColor} 
                                            subtextColor={subtextColor} 
                                            title="Growth Track"
                                            desc="We're building a structured pathway to map your tenure, trajectory, and personal milestones. Soon, you'll be able to access handbook resources and complete training chapters here."
                                            icon="book.fill"
                                            color="#34C759"
                                        />
                                    ) : activeSegment === 'values' ? (
                                        <ComingSoonCard 
                                            isDark={isDark} 
                                            textColor={textColor} 
                                            subtextColor={subtextColor} 
                                            title="Values & Culture"
                                            desc="Aligning personal achievements with our core studio principles. Soon, peer reviews, culture index tracking, and alignment indicators will be available on this screen."
                                            icon="heart.fill"
                                            color="#FF2D55"
                                        />
                                    ) : (
                                        <View style={[s.placeholder, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                            <PlatformIcon
                                                name={(ME_SEGMENTS.find(segment => segment.id === activeSegment)?.icon || 'person.fill') as any}
                                                size={48}
                                                tintColor={subtextColor}
                                            />
                                            <Text style={[s.placeholderTitle, { color: textColor }]}>Me • {ME_SEGMENTS.find(segment => segment.id === activeSegment)?.label}</Text>
                                            <Text style={[s.placeholderDesc, { color: subtextColor }]}>Content for this segment is coming soon.</Text>
                                        </View>
                                    )
                        ) : (
                            activeTeamSegment === 'directory' ? <ManagerialDirectoryTab isDark={isDark} textColor={textColor} subtextColor={subtextColor} />
                                : activeTeamSegment === 'performance_index' ? <ManagerialPerformanceTab isDark={isDark} textColor={textColor} subtextColor={subtextColor} />
                                    : activeTeamSegment === 'setup' ? <ManagerialSetupTab isDark={isDark} textColor={textColor} subtextColor={subtextColor} />
                                        : (
                                            <View style={[s.placeholder, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                                <PlatformIcon
                                                    name={(TEAM_SEGMENTS.find(segment => segment.id === activeTeamSegment)?.icon || 'person.3.fill') as any}
                                                    size={48}
                                                    tintColor={subtextColor}
                                                />
                                                <Text style={[s.placeholderTitle, { color: textColor }]}>Team • {TEAM_SEGMENTS.find(segment => segment.id === activeTeamSegment)?.label}</Text>
                                                <Text style={[s.placeholderDesc, { color: subtextColor }]}>Content for this segment is coming soon.</Text>
                                            </View>
                                        )
                        )}
                    </View>
                </ScrollView>
                </SwipeTabWrapper>
            )}

            {/* Native SwiftUI Export BottomSheet */}
            <SwiftUIExportSheet
                isOpened={isExportModalVisible}
                onClose={() => setIsExportModalVisible(false)}
                activeSegment={activeSegment}
                onPreview={handleExport}
            />

            <CrewDocumentPreview
                visible={docPreviewVisible}
                onClose={() => {
                    setDocPreviewVisible(false);
                    setDocPreviewHtml(null);
                }}
                html={docPreviewHtml}
                title={docPreviewTitle}
            />

            {/* Quick Actions Sheet */}
            <Modal
                visible={isActionSheetVisible}
                transparent
                animationType="slide"
                statusBarTranslucent={true}
                onRequestClose={() => setIsActionSheetVisible(false)}
            >
                <View style={s.overlay}>
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFill} 
                        activeOpacity={1} 
                        onPress={() => setIsActionSheetVisible(false)}
                    >
                        <View style={{ flex: 1 }} />
                    </TouchableOpacity>
                    <GlassView intensity={60} style={[s.content, { height: 'auto', backgroundColor: Platform.OS === 'android' ? (isDark ? '#1C1C1E' : '#FFFFFF') : (isDark ? 'rgba(28,28,30,0.85)' : 'rgba(242,242,247,0.85)') }]}>
                        <View style={{ padding: 24, paddingBottom: Platform.OS === 'android' ? (insets.bottom > 0 ? insets.bottom + 12 : 24) : Math.max(insets.bottom - 12, 12) }}>
                            {/* Header */}
                            <View style={s.modalHeader}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={[s.modalTitle, { color: textColor }]}>Quick Actions</Text>
                                    <Text style={{ fontSize: 13, color: subtextColor, marginTop: 4 }}>
                                        Choose an action to manage your personal profile
                                    </Text>
                                </View>
                                <TouchableOpacity 
                                    onPress={() => setIsActionSheetVisible(false)} 
                                    style={[s.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
                                >
                                    <Ionicons name="close" size={20} color={textColor} />
                                </TouchableOpacity>
                            </View>

                            {/* Actions List */}
                            <View style={{ gap: 8, marginTop: 8 }}>
                                {/* Action 1: Upload Document */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[s.itemRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                                    onPress={() => {
                                        setIsActionSheetVisible(false);
                                        setTimeout(() => {
                                            Alert.alert(
                                                'Select Category',
                                                'Choose document type:',
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Pas Foto (Profile Photo)', onPress: () => handleActionUploadDoc('Pas Foto') },
                                                    { text: 'KTP (National ID)', onPress: () => handleActionUploadDoc('KTP') },
                                                    { text: 'NPWP (Tax ID)', onPress: () => handleActionUploadDoc('NPWP') },
                                                    { text: 'CV / Resume', onPress: () => handleActionUploadDoc('CV') },
                                                    { text: 'Ijazah / Diploma', onPress: () => handleActionUploadDoc('Diploma') }
                                                ]
                                            );
                                        }, 400);
                                    }}
                                >
                                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 122, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Ionicons name="document-text" size={20} color="#007AFF" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.itemLabel, { color: textColor }]}>Upload Document</Text>
                                        <Text style={{ fontSize: 11, color: subtextColor, marginTop: 2 }}>Upload NPWP, KTP, CV, or diploma file</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={subtextColor} />
                                </TouchableOpacity>

                                {/* Action 2: Edit Contact Info */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[s.itemRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                                    onPress={() => {
                                        setIsActionSheetVisible(false);
                                        setTimeout(() => {
                                            router.push('/profile-details/identity');
                                        }, 400);
                                    }}
                                >
                                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 122, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Ionicons name="create" size={20} color="#007AFF" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.itemLabel, { color: textColor }]}>Edit Contact Info</Text>
                                        <Text style={{ fontSize: 11, color: subtextColor, marginTop: 2 }}>Update WhatsApp, email, nickname, and socials</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={subtextColor} />
                                </TouchableOpacity>

                                {/* Action 3: Request Data Change */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={[s.itemRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                                    onPress={() => {
                                        setIsActionSheetVisible(false);
                                        setTimeout(() => {
                                            Alert.alert(
                                                'Request Data Change',
                                                'To request changes to locked profile records (such as Legal Name, Employee ID, position, or bank details), please submit a request to HR.',
                                                [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { 
                                                        text: 'Email HR', 
                                                        onPress: () => {
                                                            Linking.openURL('mailto:admin@adidayastudio.id?subject=Request%20Data%20Change&body=Name:%20' + (profile?.full_name || '') + '%0D%0AEmployee%20ID:%20' + (profile?.id_number || '') + '%0D%0A%0D%0ADesired%20Change:');
                                                        }
                                                    }
                                                ]
                                            );
                                        }, 400);
                                    }}
                                >
                                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0, 122, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                        <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.itemLabel, { color: textColor }]}>Request Data Change</Text>
                                        <Text style={{ fontSize: 11, color: subtextColor, marginTop: 2 }}>Ask HR to edit locked bank account or official records</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color={subtextColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </GlassView>
                </View>
            </Modal>
        </>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    seg: { marginBottom: 24, marginHorizontal: -4 },
    placeholder: { borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', padding: 60, alignItems: 'center', gap: 12, marginTop: 20 },
    placeholderText: { fontSize: 15, fontWeight: '500' },
    placeholderTitle: { fontSize: 16, fontWeight: '600' },
    placeholderDesc: { fontSize: 14, textAlign: 'center' },
    inlineSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        borderWidth: 1,
        marginTop: 8,
        marginBottom: 12,
    },
    inlineSearchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        paddingVertical: 0,
    },
    inlineCancelButton: {
        paddingLeft: 8,
        paddingVertical: 4,
    },
    comingSoonCard: {
        borderRadius: 24,
        padding: 24,
        marginTop: 8,
        gap: 16,
    },
    comingSoonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    comingSoonIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    comingSoonBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    comingSoonTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    comingSoonDesc: {
        fontSize: 14,
        lineHeight: 20,
    },
    comingSoonPreview: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 10,
        marginTop: 4,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    previewDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    previewLineShort: {
        height: 8,
        borderRadius: 4,
        width: '50%',
    },
    previewLineLong: {
        height: 8,
        borderRadius: 4,
        width: '80%',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    content: {
        marginHorizontal: Platform.OS === 'android' ? 0 : 8,
        marginBottom: Platform.OS === 'android' ? 0 : 8,
        borderTopLeftRadius: Platform.OS === 'android' ? 32 : 44,
        borderTopRightRadius: Platform.OS === 'android' ? 32 : 44,
        borderBottomLeftRadius: Platform.OS === 'android' ? 0 : 44,
        borderBottomRightRadius: Platform.OS === 'android' ? 0 : 44,
        overflow: 'hidden',
        height: '80%',
    },
    dragIndicator: {
        width: 36,
        height: 5,
        backgroundColor: 'rgba(142,142,147,0.3)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    selectAllBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    selectAllText: {
        fontSize: 13,
        fontWeight: '600',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
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
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        borderRightWidth: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    splitListHeader: { ...DESKTOP_PANEL_HEADER },
    splitListHeaderTitleRow: { ...DESKTOP_PANEL_TITLE_ROW },
    splitListHeaderTitle: { ...DESKTOP_PANEL_TITLE },
    headerActionCircle: { ...DESKTOP_PANEL_ACTION },
    splitRightPane: {
        flex: 2,
        minWidth: 400,
    },
    desktopEmptyPane: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    desktopEmptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    desktopEmptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    desktopEmptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 360,
        lineHeight: 20,
    },
});

