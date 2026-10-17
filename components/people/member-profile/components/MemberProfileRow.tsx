import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface MemberProfileRowProps {
    sectionKey: string;
    fieldKey: string;
    label: string;
    icon: string;
    isLast?: boolean;
    canCopy?: boolean;
    isEditable?: boolean;
    keyboardType?: any;
    maxLength?: number;
    placeholder?: string;
    activeSection: string | null;
    profile: any;
    editForm: any;
    setEditForm: React.Dispatch<React.SetStateAction<any>>;
    computeEmployeeIdentifiers: (...args: any[]) => any;
    copyToClipboard: (text: string, label: string) => void;
    textColor: string;
    subtextColor: string;
    borderColor: string;
}

export const MemberProfileRow: React.FC<MemberProfileRowProps> = ({
    sectionKey,
    fieldKey,
    label,
    icon,
    isLast = false,
    canCopy = false,
    isEditable = true,
    keyboardType = 'default',
    maxLength,
    placeholder,
    activeSection,
    profile,
    editForm,
    setEditForm,
    computeEmployeeIdentifiers,
    copyToClipboard,
    textColor,
    subtextColor,
    borderColor,
}) => {
    const [isRevealed, setIsRevealed] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState(false);
    const isEditing = activeSection === sectionKey && isEditable;
    const val = profile[fieldKey] || '';
    const editVal = editForm[fieldKey] || '';

    const isSecureField = fieldKey === 'bank_account_number';

    const handleCopy = () => {
        copyToClipboard(val, label);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };

    const displayValue = () => {
        if (!val) return '—';
        if (isSecureField && !isRevealed) {
            return val.length > 4 ? `•••• ${val.slice(-4)}` : val.replace(/./g, '•');
        }
        return val;
    };

    return (
        <View key={fieldKey}>
            <View style={styles.formRow}>
                <View style={styles.rowLeft}>
                    <PlatformIcon name={icon as any} size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                    <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
                </View>
                {isEditing ? (
                    <TextInput
                        style={[styles.seamlessInput, { color: textColor }]}
                        value={editVal}
                        onChangeText={(text) => {
                            let formatted = text;
                            if (fieldKey === 'nik') {
                                formatted = text.replace(/[^0-9]/g, '').slice(0, 16);
                                setEditForm((prev: any) => ({ ...prev, [fieldKey]: formatted }));
                            } else if (fieldKey === 'personal_email') {
                                formatted = text.toLowerCase().trim();
                                setEditForm((prev: any) => ({ ...prev, [fieldKey]: formatted }));
                            } else if (fieldKey === 'order_number') {
                                formatted = text.replace(/[^0-9]/g, '').slice(0, 4);
                                const computed = computeEmployeeIdentifiers(
                                    editForm.department || profile.department,
                                    editForm.position || profile.position,
                                    editForm.level || profile.level,
                                    formatted,
                                    editForm.join_date || profile.join_date
                                );
                                setEditForm((prev: any) => ({
                                    ...prev,
                                    order_number: formatted,
                                    employee_id: computed.employee_id,
                                    id_code: computed.id_code,
                                    }));
                            } else {
                                setEditForm((prev: any) => ({ ...prev, [fieldKey]: formatted }));
                            }
                        }}
                        keyboardType={keyboardType}
                        maxLength={maxLength}
                        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
                        placeholderTextColor={subtextColor}
                        autoCapitalize={fieldKey === 'personal_email' ? 'none' : undefined}
                        autoCorrect={false}
                        selectionColor="#007AFF"
                    />
                ) : (
                    <View style={styles.rowRight}>
                        <Text style={[styles.rowValue, { color: val ? textColor : subtextColor, letterSpacing: (isSecureField && !isRevealed && val) ? 1.5 : 0 }]}>
                            {displayValue()}
                        </Text>
                        {isSecureField && val && val !== '—' && (
                            <TouchableOpacity
                                onPress={() => setIsRevealed(!isRevealed)}
                                style={{ marginLeft: 8, padding: 2 }}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon
                                    name={isRevealed ? 'eye.slash' : 'eye'}
                                    size={14}
                                    tintColor={subtextColor}
                                />
                            </TouchableOpacity>
                        )}
                        {canCopy && val && val !== '—' && (
                            <TouchableOpacity onPress={handleCopy} style={{ marginLeft: 6, padding: 2 }} activeOpacity={0.7}>
                                <PlatformIcon
                                    name={isCopied ? "checkmark" : "doc.on.doc"}
                                    size={13}
                                    tintColor={isCopied ? "#34C759" : subtextColor}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
            {!isLast && <View style={[styles.separator, { backgroundColor: borderColor }]} />}
        </View>
    );
};

const styles = StyleSheet.create({
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 46,
        paddingVertical: 10,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '400',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
        marginLeft: 12,
    },
    rowValue: {
        fontSize: 15,
        fontWeight: '400',
        textAlign: 'right',
        flexShrink: 1,
    },
    seamlessInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
        textAlign: 'right',
        marginLeft: 12,
        paddingVertical: 0,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 26,
    },
});
