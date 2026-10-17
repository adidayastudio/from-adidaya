import React, { useState, useEffect } from 'react';
import {
    Platform,
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import * as Haptics from 'expo-haptics';

export type LegalTab = 'about' | 'terms' | 'privacy';

export interface LegalInfoSheetProps {
    visible: boolean;
    onClose: () => void;
    initialTab?: LegalTab;
    isDark?: boolean;
    textColor?: string;
    subtextColor?: string;
}

const LEGAL_SEGMENTS: Segment[] = [
    { id: 'about', label: 'About' },
    { id: 'terms', label: 'Terms' },
    { id: 'privacy', label: 'Privacy' },
];

export const LegalInfoSheet: React.FC<LegalInfoSheetProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./LegalInfoSheet.ios').LegalInfoSheetIOS;
        return <Comp {...props} />;
    }

    const { visible, onClose, initialTab = 'about' } = props;
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const cardBg = isDark ? '#2C2C2E' : (Platform.OS === 'web' ? '#F8F9FA' : '#FFFFFF');
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

    useEffect(() => {
        if (visible) {
            setActiveTab(initialTab);
        }
    }, [visible, initialTab]);

    const handleTabChange = (tabId: string) => {
        Haptics.selectionAsync();
        setActiveTab(tabId as LegalTab);
    };

    const getTitle = () => {
        if (activeTab === 'about') return 'About Forma';
        if (activeTab === 'terms') return 'Terms of Service';
        return 'Privacy Policy';
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
            navigationBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View
                    style={[
                        styles.drawerContainer,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            paddingBottom: Math.max(insets.bottom, 20),
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={[styles.headerTitle, { color: textColor }]}>
                                {getTitle()}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[
                                styles.closeButton,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                            ]}
                        >
                            <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Segmented Control Pill (Full-width for LegalInfoSheet) */}
                    <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                        <SegmentedControl
                            segments={LEGAL_SEGMENTS}
                            activeSegment={activeTab}
                            onSegmentChange={handleTabChange}
                            fullWidth
                        />
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView
                        style={styles.scrollBody}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {activeTab === 'about' && (
                            <>
                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        Forma Operational System
                                    </Text>
                                    <Text style={[styles.versionText, { color: '#007AFF' }]}>
                                        Version 0.1.0 · Build 2026.10
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        Forma is a modern enterprise operational OS engineered for high-performance teams. It provides seamless multi-tenant organization workspaces, high-precision geofence attendance, synchronized team roles, real-time project collaboration, and enterprise-grade security.
                                    </Text>
                                </View>

                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 12 }]}>
                                        Core Pillars & Architecture
                                    </Text>

                                    <View style={styles.pillarItem}>
                                        <Text style={[styles.pillarTitle, { color: textColor }]}>
                                            Zero-Trust Multi-Tenancy
                                        </Text>
                                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                                            Isolated tenant partitions, cryptographic join codes, and strictly enforced Row-Level Security (RLS) across every data query.
                                        </Text>
                                    </View>

                                    <View style={[styles.divider, { backgroundColor: borderColor }]} />

                                    <View style={styles.pillarItem}>
                                        <Text style={[styles.pillarTitle, { color: textColor }]}>
                                            Geofenced Precision Presence
                                        </Text>
                                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                                            Configurable attendance radii, anti-spoofing coordinate verification, and real-time attendance telemetry.
                                        </Text>
                                    </View>

                                    <View style={[styles.divider, { backgroundColor: borderColor }]} />

                                    <View style={styles.pillarItem}>
                                        <Text style={[styles.pillarTitle, { color: textColor }]}>
                                            Sub-Second Synchronization
                                        </Text>
                                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                                            Instant offline caching, biometric authentication support, and distributed edge cloud replication.
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.copyrightText, { color: subtextColor }]}>
                                    © 2026 Forma Technologies Inc. All rights reserved. Developed for high-security enterprise operations.
                                </Text>
                            </>
                        )}

                        {activeTab === 'terms' && (
                            <>
                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        1. Acceptance of Terms
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        By accessing or using the Forma application, services, or associated enterprise tenant workspaces, you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or legal entity, you represent that you possess the authority to bind such entity.
                                    </Text>
                                </View>

                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        2. Tenant Workspaces & Roles
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        Access to specific features within an organization is determined by assigned Role-Based Access Control (RBAC) levels (System, Super Admin, Admin, Member, Viewer). Tenant administrators maintain sole responsibility for user provisioning, permission configuration, and workspace management.
                                    </Text>
                                </View>

                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        3. Acceptable Use Policy
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        You agree not to misuse Forma services, attempt unauthorized access to other tenant databases, bypass geofence telemetry verification, reverse-engineer proprietary algorithms, or introduce malicious payloads into the system.
                                    </Text>
                                </View>

                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        4. Service Availability & SLA
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        Forma targets 99.95% cloud service availability. Regular security updates and maintenance windows will be communicated in advance whenever feasible.
                                    </Text>
                                </View>

                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        5. Termination & Data Portability
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        Super Admins retain full rights to deactivate or export tenant data at any time through the Security console. Upon deactivation, workspace access is revoked while records remain preserved in accordance with enterprise retention guidelines.
                                    </Text>
                                </View>
                            </>
                        )}

                        {activeTab === 'privacy' && (
                            <>
                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        1. Data Collection & Privacy
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        Forma prioritizes data sovereignty and privacy by design. We collect only data strictly necessary for enterprise workforce management, identity verification, and collaborative operations. We do not sell or monetize personal or operational data to third parties.
                                    </Text>
                                </View>

                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        2. Geolocation & Telemetry
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        Location services are utilized solely to verify physical presence within configured organization geofence radii at the exact moment of attendance check-in. Continuous background tracking is never executed without explicit user consent.
                                    </Text>
                                </View>

                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        3. Encryption & Security
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        All data in transit is protected using TLS 1.3 cryptographic protocols with modern cipher suites. Sensitive credentials, authentication tokens, and tenant databases are encrypted at rest with AES-256 standards.
                                    </Text>
                                </View>

                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        4. Global Compliance Standards
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        Forma is architected in accordance with global data protection standards, including GDPR, CCPA, and SOC 2 Type II controls. Users and organizations hold the right to request access, rectification, or complete deletion of their stored operational records.
                                    </Text>
                                </View>

                                <View style={[styles.cardSection, { backgroundColor: cardBg, borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: textColor }]}>
                                        5. Data Protection Officer
                                    </Text>
                                    <Text style={[styles.bodyText, { color: subtextColor }]}>
                                        For inquiries regarding security audits, data processing agreements (DPA), or privacy requests, contact compliance@forma.io.
                                    </Text>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    drawerContainer: {
        maxHeight: '90%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 18,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentedWrapper: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentBtnActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 13,
    },
    scrollBody: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingTop: 2,
        paddingBottom: 24,
        gap: 12,
    },
    cardSection: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6,
    },
    versionText: {
        fontSize: 12.5,
        fontWeight: '600',
        marginBottom: 8,
    },
    bodyText: {
        fontSize: 13.5,
        lineHeight: 20,
    },
    pillarItem: {
        gap: 4,
    },
    pillarTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 10,
    },
    copyrightText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 12,
    },
});

export default LegalInfoSheet;
