import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';

interface TopUpModalProps {
    visible: boolean;
    onClose: () => void;
    pool: any;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({ visible, onClose, pool }) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#C7C7CC' : '#8E8E93';
    const placeholderColor = isDark ? 'rgba(255,255,255,0.52)' : undefined;
    const { topUpPettyCash } = useFinance();

    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!amount) {
            Alert.alert('Missing Amount', 'Please specify how much to top up.');
            return;
        }

        setIsSubmitting(true);
        try {
            const parsedAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
            await topUpPettyCash(pool.id, parsedAmount, notes);
            Alert.alert('Success', `Topped up ${pool.projectName} by Rp ${parsedAmount.toLocaleString('id-ID')}`);
            setAmount('');
            setNotes('');
            onClose();
        } catch (error: any) {
            console.error("Top up error:", error);
            Alert.alert('Error', error.message || 'Failed to top up petty cash.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!pool) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={[s.content, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
                    <View style={s.header}>
                        <Text style={[s.headerTitle, { color: textColor }]}>Top Up Petty Cash</Text>
                        <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
                            <Text style={{ color: '#007AFF', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={s.poolInfo}>
                        <View style={s.badge}>
                            <Text style={s.badgeText}>{pool.projectId}</Text>
                        </View>
                        <Text style={[s.poolName, { color: textColor }]}>{pool.projectName}</Text>
                    </View>

                    <Text style={[s.label, { color: subtextColor }]}>TOP UP AMOUNT</Text>
                    <View style={s.amountContainer}>
                        <Text style={[s.currency, { color: subtextColor }]}>Rp</Text>
                        <TextInput
                            style={[s.amountInput, { color: textColor }]}
                            placeholder="0"
                            placeholderTextColor={placeholderColor}
                            keyboardType="numeric"
                            autoFocus
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>

                    <Text style={[s.label, { color: subtextColor, marginTop: 24 }]}>NOTES</Text>
                    <TextInput
                        style={[s.notesInput, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                        placeholder="Reason for top up..."
                        placeholderTextColor={placeholderColor}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />

                    <TouchableOpacity 
                        style={[s.submitButton, isSubmitting && s.submitButtonDisabled]} 
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={s.submitButtonText}>Confirm Top Up</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    content: { borderRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    poolInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
    badge: { backgroundColor: '#AF52DE20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { color: '#AF52DE', fontSize: 12, fontWeight: '800' },
    poolName: { fontSize: 16, fontWeight: '600' },
    label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
    amountContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    currency: { fontSize: 24, fontWeight: '700' },
    amountInput: { fontSize: 32, fontWeight: '800', flex: 1 },
    notesInput: { borderRadius: 12, padding: 16, minHeight: 80, fontSize: 15 },
    submitButton: { backgroundColor: '#007AFF', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
