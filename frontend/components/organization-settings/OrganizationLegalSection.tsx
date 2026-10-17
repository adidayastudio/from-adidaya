import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import * as Haptics from 'expo-haptics';

export type LegalTab = 'about' | 'terms' | 'privacy';

export interface OrganizationLegalSectionProps {
    initialTab?: LegalTab;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    cardBgColor: string;
    borderColor: string;
    onTabChange?: (tab: LegalTab) => void;
}

const LEGAL_SEGMENTS: Segment[] = [
    { id: 'about', label: 'About' },
    { id: 'terms', label: 'Terms' },
    { id: 'privacy', label: 'Privacy' },
];

export const OrganizationLegalSection: React.FC<OrganizationLegalSectionProps> = ({
    initialTab = 'about',
    isDark,
    textColor,
    subtextColor,
    cardBgColor,
    borderColor,
    onTabChange,
}) => {
    const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const handleSegmentChange = (tabId: string) => {
        Haptics.selectionAsync();
        const tab = tabId as LegalTab;
        setActiveTab(tab);
        onTabChange?.(tab);
    };

    const separatorColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
            {/* Segmented Control Pill */}
            <View style={styles.segmentedWrapper}>
                <SegmentedControl
                    segments={LEGAL_SEGMENTS}
                    activeSegment={activeTab}
                    onSegmentChange={handleSegmentChange}
                    fullWidth
                />
            </View>

            {/* TAB: ABOUT */}
            {activeTab === 'about' && (
                <View style={styles.tabContent}>
                    {/* Header Card */}
                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            Forma Operational System
                        </Text>
                        <Text style={styles.versionBadge}>
                            Version 0.1.0 · Build 2026.10
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            Forma is a modern enterprise operational OS engineered for high-performance teams. It provides seamless multi-tenant organization workspaces, high-precision geofence attendance, synchronized team roles, real-time project collaboration, and enterprise-grade security.
                        </Text>
                    </View>

                    {/* Core Pillars */}
                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor, marginBottom: 14 }]}>
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

                        <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                        <View style={styles.pillarItem}>
                            <Text style={[styles.pillarTitle, { color: textColor }]}>
                                Geofenced Precision Presence
                            </Text>
                            <Text style={[styles.bodyText, { color: subtextColor }]}>
                                Configurable attendance radii, anti-spoofing coordinate verification, and real-time attendance telemetry.
                            </Text>
                        </View>

                        <View style={[styles.separator, { backgroundColor: separatorColor }]} />

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
                </View>
            )}

            {/* TAB: TERMS */}
            {activeTab === 'terms' && (
                <View style={styles.tabContent}>
                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            1. Acceptance of Terms
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            By accessing or using the Forma application, services, or associated enterprise tenant workspaces, you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or legal entity, you represent that you possess the authority to bind such entity.
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            2. Tenant Workspaces & Roles
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            Access to specific features within an organization is determined by assigned Role-Based Access Control (RBAC) levels (System, Super Admin, Admin, Member, Viewer). Tenant administrators maintain sole responsibility for user provisioning, permission configuration, and workspace management.
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            3. Acceptable Use Policy
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            You agree not to misuse Forma services, attempt unauthorized access to other tenant databases, bypass geofence telemetry verification, reverse-engineer proprietary algorithms, or introduce malicious payloads into the system.
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            4. Service Availability & SLA
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            Forma targets 99.95% cloud service availability. Regular security updates and maintenance windows will be communicated in advance whenever feasible.
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            5. Termination & Data Portability
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            Super Admins retain full rights to deactivate or export tenant data at any time through the Security console. Upon deactivation, workspace access is revoked while records remain preserved in accordance with enterprise retention guidelines.
                        </Text>
                    </View>
                </View>
            )}

            {/* TAB: PRIVACY */}
            {activeTab === 'privacy' && (
                <View style={styles.tabContent}>
                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            1. Data Collection & Privacy
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            Forma prioritizes data sovereignty and privacy by design. We collect only data strictly necessary for enterprise workforce management, identity verification, and collaborative operations. We do not sell or monetize personal or operational data to third parties.
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            2. Geolocation & Telemetry
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            Location services are utilized solely to verify physical presence within configured organization geofence radii at the exact moment of attendance check-in. Continuous background tracking is never executed without explicit user consent.
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            3. Encryption & Security
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            All data in transit is protected using TLS 1.3 cryptographic protocols with modern cipher suites. Sensitive credentials, authentication tokens, and tenant databases are encrypted at rest with AES-256 standards.
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            4. Global Compliance Standards
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            Forma is architected in accordance with global data protection standards, including GDPR, CCPA, and SOC 2 Type II controls. Users and organizations hold the right to request access, rectification, or complete deletion of their stored operational records.
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                        <Text style={[styles.cardTitle, { color: textColor }]}>
                            5. Data Protection Officer
                        </Text>
                        <Text style={[styles.bodyText, { color: subtextColor }]}>
                            For inquiries regarding security audits, data processing agreements (DPA), or privacy requests, contact compliance@forma.io.
                        </Text>
                    </View>
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    segmentedWrapper: {
        marginBottom: 4,
    },
    tabContent: {
        gap: 14,
    },
    card: {
        borderRadius: 22,
        padding: 20,
        gap: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    versionBadge: {
        fontSize: 13,
        fontWeight: '700',
        color: '#007AFF',
        marginBottom: 4,
    },
    bodyText: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '400',
    },
    pillarItem: {
        gap: 4,
    },
    pillarTitle: {
        fontSize: 14.5,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 10,
    },
    copyrightText: {
        fontSize: 12.5,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
});
