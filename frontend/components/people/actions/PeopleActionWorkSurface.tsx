import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Action } from '@/constants/MockData';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    completeAcknowledgeEmploymentAction,
    completeSignDocumentAction,
} from '@/lib/workflows/peopleWorkflow';

interface PeopleActionWorkSurfaceProps {
    action: Action;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    onActionCompleted?: () => void;
}

export const PeopleActionWorkSurface: React.FC<PeopleActionWorkSurfaceProps> = ({
    action,
    isDark,
    textColor,
    subtextColor,
    onActionCompleted,
}) => {
    const [submitting, setSubmitting] = useState(false);
    const [signatureText, setSignatureText] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const isEmploymentUpdate = action.title.toLowerCase().includes('acknowledge employment update') || action.sourceInfo?.recordType === 'employment_update';
    const isSignDoc = action.title.toLowerCase().startsWith('sign ') || action.sourceInfo?.recordType === 'signature_request';

    const empUpdate = action.details?.employmentUpdate || action.moduleDetails;
    const docSig = action.details?.documentSignature || {
        documentTitle: action.title.replace(/^Sign\s+/i, ''),
        documentId: action.sourceInfo?.recordId || action.id,
        fileUrl: action.proofUrl,
    };

    const handleAcknowledge = async () => {
        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const userId = action.sourceInfo?.recordId || action.requestedBy || '1';
            const ok = await completeAcknowledgeEmploymentAction(action.id, userId);

            if (ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Acknowledged', 'Employment update has been successfully acknowledged and recorded.');
                onActionCompleted?.();
            } else {
                throw new Error('Failed to update status.');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not complete acknowledgement.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSign = async () => {
        if (!signatureText.trim()) {
            Alert.alert('Signature Required', 'Please type your full legal name to sign this document.');
            return;
        }

        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const userId = action.sourceInfo?.recordId || action.requestedBy || '1';
            const docId = docSig.documentId || action.id;
            const ok = await completeSignDocumentAction(action.id, docId, userId, signatureText.trim());

            if (ok) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Document Signed', `You have successfully signed "${docSig.documentTitle}".`);
                onActionCompleted?.();
            } else {
                throw new Error('Failed to submit document signature.');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not submit signature.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={s.container}>
            {/* ACTION 1: Acknowledge Employment Update */}
            {isEmploymentUpdate && (
                <View style={s.stack}>
                    <View style={[s.celebrationCard, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.12)' : 'rgba(52, 199, 89, 0.08)', borderColor: isDark ? 'rgba(52, 199, 89, 0.3)' : 'rgba(52, 199, 89, 0.2)' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[s.celebrateIconCircle, { backgroundColor: '#34C759' }]}>
                                <PlatformIcon name="sparkles" size={18} tintColor="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.celebrateTitle, { color: textColor }]}>Employment Update Summary</Text>
                                <Text style={[s.celebrateSubtitle, { color: subtextColor }]}>
                                    Your official employment details have been updated.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Summary Comparison Grid */}
                    <View style={[s.detailsBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <View style={s.infoRow}>
                            <Text style={[s.infoKey, { color: subtextColor }]}>Position</Text>
                            <Text style={[s.infoVal, { color: textColor }]}>
                                {empUpdate?.previousPosition ? `${empUpdate.previousPosition} → ` : ''}
                                <Text style={{ fontWeight: '700', color: '#007AFF' }}>{empUpdate?.position || 'Senior Architect'}</Text>
                            </Text>
                        </View>

                        <View style={s.infoRow}>
                            <Text style={[s.infoKey, { color: subtextColor }]}>Level / Grade</Text>
                            <Text style={[s.infoVal, { color: textColor }]}>
                                {empUpdate?.previousLevel ? `${empUpdate.previousLevel} → ` : ''}
                                <Text style={{ fontWeight: '700', color: '#007AFF' }}>{empUpdate?.level || 'Level 3'}</Text>
                            </Text>
                        </View>

                        <View style={s.infoRow}>
                            <Text style={[s.infoKey, { color: subtextColor }]}>Division / Dept</Text>
                            <Text style={[s.infoVal, { color: textColor }]}>
                                {empUpdate?.previousDepartment ? `${empUpdate.previousDepartment} → ` : ''}
                                <Text style={{ fontWeight: '700', color: '#007AFF' }}>{empUpdate?.division || empUpdate?.department || 'Design Management'}</Text>
                            </Text>
                        </View>

                        <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                            <Text style={[s.infoKey, { color: subtextColor }]}>Effective Date</Text>
                            <Text style={[s.infoVal, { color: textColor, fontWeight: '600' }]}>
                                {empUpdate?.effectiveDate || empUpdate?.targetDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>

                    {/* Primary Button: Acknowledge */}
                    <TouchableOpacity
                        onPress={handleAcknowledge}
                        disabled={submitting}
                        style={[s.primaryButton, { backgroundColor: '#34C759', opacity: submitting ? 0.7 : 1 }]}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <PlatformIcon name="checkmark.circle.fill" size={18} tintColor="#FFFFFF" />
                                <Text style={s.primaryButtonText}>Acknowledge</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* ACTION 2: Sign Document */}
            {isSignDoc && (
                <View style={s.stack}>
                    <View style={[s.detailsBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <View style={[s.celebrateIconCircle, { backgroundColor: '#007AFF' }]}>
                                <PlatformIcon name="doc.text.fill" size={18} tintColor="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.celebrateTitle, { color: textColor }]}>{docSig.documentTitle || action.title}</Text>
                                <Text style={[s.celebrateSubtitle, { color: subtextColor }]}>
                                    {docSig.documentType || 'Official Document'} · Pending Signature
                                </Text>
                            </View>
                        </View>

                        {/* Signature Input */}
                        <Text style={[s.inputHeaderLabel, { color: subtextColor }]}>Type Full Name as Electronic Signature</Text>
                        <TextInput
                            value={signatureText}
                            onChangeText={setSignatureText}
                            style={[s.signInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}
                            placeholder="Type your legal full name"
                            placeholderTextColor={subtextColor}
                            autoCapitalize="words"
                        />

                        {/* Agreement Checkbox */}
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                setAgreedToTerms(!agreedToTerms);
                            }}
                            style={s.termsRow}
                        >
                            <View style={[s.checkSquare, { backgroundColor: agreedToTerms ? '#007AFF' : 'transparent', borderColor: agreedToTerms ? '#007AFF' : subtextColor }]}>
                                {agreedToTerms && <PlatformIcon name="checkmark" size={12} tintColor="#FFFFFF" />}
                            </View>
                            <Text style={[s.termsText, { color: subtextColor }]}>
                                I confirm this represents my legally binding electronic signature for this document.
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Primary Button: Sign */}
                    <TouchableOpacity
                        onPress={handleSign}
                        disabled={submitting || !agreedToTerms || !signatureText.trim()}
                        style={[s.primaryButton, { backgroundColor: '#007AFF', opacity: (submitting || !agreedToTerms || !signatureText.trim()) ? 0.5 : 1 }]}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <PlatformIcon name="signature" size={18} tintColor="#FFFFFF" />
                                <Text style={s.primaryButtonText}>Sign Document</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Contextual link: Open in People */}
            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const uid = action.sourceInfo?.recordId || action.requestedBy;
                    if (uid) {
                        router.push(`/member-profile/${uid}` as any);
                    } else {
                        router.push('/(tabs)/home/people' as any);
                    }
                }}
                style={[s.secondaryLinkButton, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}
            >
                <PlatformIcon name="arrow.up.right.square" size={15} tintColor="#007AFF" />
                <Text style={s.secondaryLinkText}>Open in People</Text>
            </TouchableOpacity>
        </View>
    );
};

const s = StyleSheet.create({
    container: {
        gap: 16,
        paddingTop: 4,
    },
    stack: {
        gap: 12,
    },
    celebrationCard: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    celebrateIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    celebrateTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    celebrateSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    detailsBox: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    infoKey: {
        fontSize: 13,
    },
    infoVal: {
        fontSize: 14,
    },
    inputHeaderLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginBottom: 6,
    },
    signInput: {
        height: 46,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 15,
        fontWeight: '600',
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    checkSquare: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    termsText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 16,
    },
    primaryButton: {
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    secondaryLinkText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
