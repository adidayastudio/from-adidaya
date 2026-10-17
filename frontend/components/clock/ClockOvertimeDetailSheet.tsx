import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OvertimeLog, RequestStatus } from '@/lib/api/attendance';
import { format, differenceInDays } from 'date-fns';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { CrewDocumentPreview } from '../crew/CrewDocumentPreview';
import { shareIndividualOvertime, generateDocHeader, commonHeaderCss } from '@/lib/shareHelper';
import { useTenantContext } from '@/context/TenantContext';

interface ClockOvertimeDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    log: OvertimeLog | null;
    viewMode: 'personal' | 'team';
    onCancel: (id: string) => void;
    onViewProof: (url: string) => void;
    onApprove?: () => void;
    onReject?: () => void;
    onRevision?: () => void;
    onDelete?: () => void;
    isEmbedded?: boolean;
}

export function ClockOvertimeDetailSheet({
    isOpened,
    onClose,
    log,
    viewMode,
    onCancel,
    onViewProof,
    onApprove,
    onReject,
    onRevision,
    onDelete,
    isEmbedded = false,
}: ClockOvertimeDetailSheetProps) {
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const [showPdfPreview, setShowPdfPreview] = React.useState(false);

    const getStatusBadgeConfig = (status: RequestStatus) => {
        switch (status) {
            case 'approved':
                return { label: 'Approved', bg: 'rgba(52, 199, 89, 0.15)', text: '#34C759' };
            case 'rejected':
                return { label: 'Rejected', bg: 'rgba(255, 59, 48, 0.15)', text: '#FF3B30' };
            case 'pending':
                return { label: 'Pending', bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500' };
            case 'cancelled':
                return { label: 'Cancelled', bg: 'rgba(142, 142, 147, 0.15)', text: '#8E8E93' };
            case 'revision':
            case 'need revision':
                return { label: 'Revision', bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500' };
            default:
                return { label: status, bg: 'rgba(142, 142, 147, 0.15)', text: '#8E8E93' };
        }
    };

    const formatLogDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'dd MMM yyyy');
        } catch {
            return dateStr;
        }
    };

    const calculateDuration = (start: string, end: string) => {
        try {
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            let diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff < 0) diff += 24 * 60;
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            return `${h}h ${m}m`;
        } catch {
            return '';
        }
    };

    const durationStr = log ? calculateDuration(log.startTime, log.endTime) : '';
    const badge = log ? getStatusBadgeConfig(log.status) : { label: '', bg: '', text: '' };

    const getStatusColor = (status: RequestStatus) => {
        switch (status) {
            case 'approved': return '#34C759';
            case 'rejected': return '#FF3B30';
            case 'pending': return '#FF9500';
            case 'revision':
            case 'need revision':
                return '#FF9500';
            default: return '#8E8E93';
        }
    };

    const policyStatus = React.useMemo(() => {
        if (!log) return null;

        const logDateObj = new Date(log.date);
        const createdDateObj = log.createdAt ? new Date(log.createdAt) : new Date();
        const diffDays = differenceInDays(createdDateObj, logDateObj);

        if (diffDays <= 1) {
            return {
                title: 'High Approval Likelihood (On-Schedule)',
                description: 'Overtime request submitted on time / per schedule. High likelihood of approval for overtime pay calculation.',
                color: '#34C759',
                bg: isDark ? 'rgba(52,199,89,0.12)' : 'rgba(52,199,89,0.08)',
                border: isDark ? 'rgba(52,199,89,0.25)' : 'rgba(52,199,89,0.2)',
                icon: 'checkmark-circle-outline'
            };
        } else {
            return {
                title: 'Late Overtime Submission',
                description: `Request submitted ${diffDays} day(s) after the overtime occurred. Requires supervisor verification prior to approval.`,
                color: '#FF9500',
                bg: isDark ? 'rgba(255,149,0,0.12)' : 'rgba(255,149,0,0.08)',
                border: isDark ? 'rgba(255,149,0,0.25)' : 'rgba(255,149,0,0.2)',
                icon: 'warning-outline'
            };
        }
    }, [log, isDark]);

    const generateHtml = () => {
        if (!log) return '';
        const tenantInfo = activeTenant ? {
            name: activeTenant.branding_name || activeTenant.name,
            logoUrl: activeTenant.branding_logo_url || activeTenant.logo_url,
            companyCode: activeTenant.company_code,
            primaryColor: activeTenant.primary_color,
            slug: activeTenant.slug
        } : undefined;
        const companyName = tenantInfo?.name || 'Forma';
        return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #1C1C1E; background-color: #FFFFFF; }
                        ${commonHeaderCss}
                        .header { border-bottom: 2px solid #AF52DE; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
                        .logo { font-size: 20px; font-weight: bold; color: #AF52DE; }
                        .doc-type { font-size: 14px; color: #8E8E93; font-weight: bold; text-transform: uppercase; }
                        h2 { text-align: center; margin-bottom: 30px; font-size: 22px; color: #1C1C1E; font-weight: 800; letter-spacing: -0.5px; }
                        .info-card { background-color: #F2F2F7; border-radius: 16px; padding: 20px; margin-bottom: 25px; }
                        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
                        .info-row:last-child { border-bottom: none; }
                        .label { color: #8E8E93; font-weight: 500; font-size: 14px; }
                        .value { font-weight: 600; font-size: 14px; color: #1C1C1E; text-align: right; }
                        .status { font-weight: 700; text-transform: uppercase; }
                        .section-title { font-size: 12px; font-weight: 800; color: #8E8E93; letter-spacing: 0.8px; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; }
                        .reason-card { border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 15px; font-size: 14px; line-height: 1.5; color: #1C1C1E; background-color: #FFF; }
                        .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #8E8E93; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 20px; }
                    </style>
                </head>
                <body>
                    ${generateDocHeader(tenantInfo, 'Overtime Request', log.requestNumber || format(new Date(), 'dd MMM yyyy'))}
                    <h2>OVERTIME REQUEST FORM</h2>
                    <div class="info-card">
                        ${viewMode === 'team' && log.userName ? `
                        <div class="info-row">
                            <div class="label">Employee</div>
                            <div class="value" style="font-weight: 700;">${log.userName}</div>
                        </div>
                        ` : ''}
                        <div class="info-row">
                            <div class="label">Request No</div>
                            <div class="value">${log.requestNumber || '-'}</div>
                        </div>
                        <div class="info-row">
                            <div class="label">Project</div>
                            <div class="value">${log.projectId === 'ady_ops' ? 'ADIDAYA OPS' : (log.projectId?.toUpperCase() || 'ADY')}</div>
                        </div>
                        <div class="info-row">
                            <div class="label">Date</div>
                            <div class="value">${formatLogDate(log.date)}</div>
                        </div>
                        <div class="info-row">
                            <div class="label">Time</div>
                            <div class="value">${log.startTime} - ${log.endTime}</div>
                        </div>
                        <div class="info-row">
                            <div class="label">Total Duration</div>
                            <div class="value" style="font-weight: 700;">${durationStr}</div>
                        </div>
                        <div class="info-row">
                            <div class="label">Status</div>
                            <div class="value status" style="color: ${getStatusColor(log.status)};">${log.status}</div>
                        </div>
                    </div>
                    
                    ${log.description ? `
                    <div class="section-title">Description of Work</div>
                    <div class="reason-card">${log.description}</div>
                    ` : ''}

                    ${log.rejectReason ? `
                    <div class="section-title" style="color: #FF3B30;">Rejection Reason</div>
                    <div class="reason-card" style="border-color: rgba(255, 59, 48, 0.2); background-color: rgba(255, 59, 48, 0.02); color: #FF3B30;">${log.rejectReason}</div>
                    ` : ''}

                    <div class="footer">
                        Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')} | ${companyName} Portal
                    </div>
                </body>
            </html>
        `;
    };

    if (!log) return null;

    return (
        <>
            <Modal 
                visible={isOpened} 
                transparent={true} 
                animationType="slide" 
                onRequestClose={onClose}
                statusBarTranslucent={true}
            >
                <View style={s.drawerOverlay}>
                    <TouchableOpacity 
                        style={StyleSheet.absoluteFillObject} 
                        activeOpacity={1} 
                        onPress={onClose} 
                    />
                    <View style={[s.drawerContentSheet, { backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : '#FFF' }]}>
                        {/* Header */}
                        <View style={s.drawerHeader}>
                            <Text style={[s.drawerHeaderTitle, { color: textColor, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                                {log.requestNumber || 'Overtime Request'}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <TouchableOpacity 
                                    style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} 
                                    onPress={() => setShowPdfPreview(true)}
                                >
                                    <Ionicons name="document-text-outline" size={18} color={subtextColor} />
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} onPress={onClose}>
                                    <Ionicons name="close" size={20} color={subtextColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <ScrollView contentContainerStyle={s.drawerContent} showsVerticalScrollIndicator={false}>
                            {/* Overtime Information Card - Matching Finance Row Styles */}
                            <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                {viewMode === 'team' && log.userName && (
                                    <>
                                        <View style={s.infoRow}>
                                            <Text style={[s.infoLabel, { color: subtextColor }]}>Employee</Text>
                                            <Text style={[s.infoValue, { color: textColor, fontWeight: '700' }]}>{log.userName}</Text>
                                        </View>
                                        <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                    </>
                                )}

                                <View style={s.infoRow}>
                                    <Text style={[s.infoLabel, { color: subtextColor }]}>Request No</Text>
                                    <Text style={[s.infoValue, { color: textColor }]}>{log.requestNumber || '-'}</Text>
                                </View>
                                <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                {log.createdAt && (
                                    <>
                                        <View style={s.infoRow}>
                                            <Text style={[s.infoLabel, { color: subtextColor }]}>Submitted On</Text>
                                            <Text style={[s.infoValue, { color: textColor }]}>
                                                {format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}
                                            </Text>
                                        </View>
                                        <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                    </>
                                )}

                                <View style={s.infoRow}>
                                    <Text style={[s.infoLabel, { color: subtextColor }]}>Project</Text>
                                    <Text style={[s.infoValue, { color: textColor }]}>
                                        {log.projectId === 'ady_ops' ? 'ADIDAYA OPS' : (log.projectId?.toUpperCase() || 'ADY')}
                                    </Text>
                                </View>
                                <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                <View style={s.infoRow}>
                                    <Text style={[s.infoLabel, { color: subtextColor }]}>Overtime Date</Text>
                                    <Text style={[s.infoValue, { color: textColor }]}>{formatLogDate(log.date)}</Text>
                                </View>
                                <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                <View style={s.infoRow}>
                                    <Text style={[s.infoLabel, { color: subtextColor }]}>Time</Text>
                                    <Text style={[s.infoValue, { color: textColor }]}>{log.startTime} - {log.endTime}</Text>
                                </View>
                                <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                <View style={s.infoRow}>
                                    <Text style={[s.infoLabel, { color: subtextColor }]}>Total Duration</Text>
                                    <Text style={[s.infoValue, { color: textColor, fontWeight: '700' }]}>{durationStr}</Text>
                                </View>
                                <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                <View style={s.infoRow}>
                                    <Text style={[s.infoLabel, { color: subtextColor }]}>Status</Text>
                                    <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                                        <Text style={[s.statusBadgeText, { color: badge.text, fontWeight: '700' }]}>
                                            {log.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Smart Policy Assessment Card */}
                            {policyStatus && (
                                <View style={[s.card, { backgroundColor: policyStatus.bg, borderColor: policyStatus.border, marginTop: 12, padding: 14 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                        <Ionicons name={policyStatus.icon as any} size={20} color={policyStatus.color} style={{ marginTop: 2 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: policyStatus.color, marginBottom: 4 }}>
                                                {policyStatus.title}
                                            </Text>
                                            <Text style={{ fontSize: 12, lineHeight: 17, color: textColor, opacity: 0.9 }}>
                                                {policyStatus.description}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {log.description && (
                                <View style={s.drawerItemsSection}>
                                    <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>DESCRIPTION OF WORK</Text>
                                    <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                        <Text style={[s.infoText, { color: textColor }]}>{log.description}</Text>
                                    </View>
                                </View>
                            )}

                            {log.rejectReason && (
                                <View style={s.drawerItemsSection}>
                                    <Text style={[s.sectionTitle, { color: '#FF3B30', marginTop: 16 }]}>REJECTION REASON</Text>
                                    <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,59,48,0.1)' : 'rgba(255,59,48,0.05)', borderColor: 'rgba(255,59,48,0.2)' }]}>
                                        <Text style={[s.infoText, { color: '#FF3B30' }]}>{log.rejectReason}</Text>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={[s.drawerFooter, { flexDirection: 'column', gap: 8 }]}>
                            {log.photoUrl && (
                                <TouchableOpacity 
                                    style={[s.drawerActionBtn, { backgroundColor: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.1)', width: '100%' }]} 
                                    onPress={() => onViewProof(log.photoUrl!)}
                                >
                                    <Text style={[s.drawerActionBtnText, { color: '#007AFF' }]}>View Proof</Text>
                                </TouchableOpacity>
                            )}
                            
                            <View style={{ flexDirection: 'column', gap: 10, width: '100%' }}>
                                {viewMode === 'team' && log.status === 'pending' ? (
                                    <>
                                        {/* Top Row: Delete, Reject, Revision */}
                                        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                                            <TouchableOpacity 
                                                style={[s.drawerActionBtn, { flex: 1, backgroundColor: isDark ? 'rgba(142,142,147,0.12)' : 'rgba(142,142,147,0.08)', borderWidth: 1, borderColor: 'rgba(142,142,147,0.2)' }]} 
                                                onPress={onDelete}
                                            >
                                                <Text style={[s.drawerActionBtnText, { color: isDark ? '#A1A1A6' : '#8E8E93' }]}>Delete</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[s.drawerActionBtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.08)', borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' }]} 
                                                onPress={onReject}
                                            >
                                                <Text style={[s.drawerActionBtnText, { color: '#FF3B30' }]}>Reject</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[s.drawerActionBtn, { flex: 1, backgroundColor: isDark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,149,0,0.2)' }]} 
                                                onPress={onRevision}
                                            >
                                                <Text style={[s.drawerActionBtnText, { color: '#FF9500' }]}>Revision</Text>
                                            </TouchableOpacity>
                                        </View>
                                        
                                        {/* Bottom Row: Big Approve */}
                                        <TouchableOpacity 
                                            style={[s.drawerActionBtn, { backgroundColor: '#34C759', width: '100%' }]} 
                                            onPress={onApprove}
                                        >
                                            <Text style={[s.drawerActionBtnText, { color: '#FFF', fontWeight: '800' }]}>Approve</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    viewMode === 'personal' && log.status === 'pending' ? (
                                        <TouchableOpacity 
                                            style={[s.drawerActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', width: '100%' }]} 
                                            onPress={() => { onClose(); onCancel(log.id); }}
                                        >
                                            <Text style={[s.drawerActionBtnText, { color: textColor }]}>Cancel Request</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity 
                                            style={[s.drawerActionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', width: '100%' }]} 
                                            onPress={onClose}
                                        >
                                            <Text style={[s.drawerActionBtnText, { color: textColor }]}>Close</Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
            {Platform.OS === 'android' && (
                <CrewDocumentPreview
                    visible={showPdfPreview}
                    onClose={() => setShowPdfPreview(false)}
                    html={generateHtml()}
                    title={`Overtime_Request_${log.requestNumber || 'Detail'}`}
                />
            )}
        </>
    );
}

const s = StyleSheet.create({
    drawerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: 0,
        paddingBottom: 0,
    },
    drawerContentSheet: {
        height: '80%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingTop: 28, paddingBottom: 12 },
    drawerHeaderTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    drawerContent: { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 20 },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 18,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    statusBadgeText: {
        fontSize: 12,
    },
    infoText: { fontSize: 14, lineHeight: 20 },
    drawerItemsSection: { marginBottom: 0 },
    drawerFooter: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24, flexDirection: 'row', gap: 12 },
    drawerActionBtn: { height: 48, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
    drawerActionBtnText: { fontSize: 15, fontWeight: '700' },
});
