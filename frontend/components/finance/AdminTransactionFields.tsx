import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import type { AdminTransactionEdit } from '@/hooks/useAdminTransactionEdit';
const money = (value: number) => `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
export function AdminTransactionFields({ editor, disabled }: { editor: AdminTransactionEdit; disabled: boolean }) {
    const { resolvedTheme } = useTheme();
    if (!editor.enabled) return null;
    const color = resolvedTheme === 'dark' ? '#FFFFFF' : '#1C1C1E';
    const input = { color, padding: 12, borderRadius: 10, backgroundColor: 'rgba(120,120,128,0.12)' };
    return <View style={{ gap: 16, padding: 16, borderRadius: 16, backgroundColor: resolvedTheme === 'dark' ? '#242424' : '#FFFFFF', marginBottom: 16 }}>
        <Text style={{ color, fontSize: 16, fontWeight: '600' }}>Payment Details</Text>
        <Text style={{ color }}>Total Paid: {money(editor.paid)}</Text>
        <Text style={{ color: editor.paid > editor.total ? '#FF3B30' : color }}>Remaining: {money(editor.remaining)}</Text>
        {editor.payments.map((payment, index) => <View key={payment.id} style={{ gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(120,120,128,0.2)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color, fontWeight: '600' }}>Payment {index + 1}</Text>
                <TouchableOpacity disabled={disabled} onPress={() => editor.remove(payment.id)}><Text style={{ color: '#FF3B30' }}>Remove Payment</Text></TouchableOpacity>
            </View>
            <Text style={{ color }}>Amount (Rp)</Text>
            <TextInput accessibilityLabel={`Payment ${index + 1} Amount`} value={payment.amount} onChangeText={value => editor.update(payment.id, 'amount', value)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#8E8E93" editable={!disabled} style={input} />
            <Text style={{ color }}>Payment Date</Text>
            <TextInput accessibilityLabel={`Payment ${index + 1} Date`} value={payment.date} onChangeText={value => editor.update(payment.id, 'date', value)} placeholder="YYYY-MM-DD" placeholderTextColor="#8E8E93" editable={!disabled} style={input} />
            <Text style={{ color }}>Payment Proof</Text>
            {payment.proofs.map((file, proofIndex) => <View key={`${proofIndex}-${file.uri}`} style={{ gap: 8 }}>
                <Text style={{ color }} numberOfLines={1}>{file.name || `Payment Proof ${proofIndex + 1}`}</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity disabled={disabled} onPress={() => editor.pick(payment.id, proofIndex)}><Text style={{ color: '#159957' }}>Replace</Text></TouchableOpacity>
                    <TouchableOpacity disabled={disabled} onPress={() => editor.removeProof(payment.id, proofIndex)}><Text style={{ color: '#FF3B30' }}>Remove</Text></TouchableOpacity>
                </View>
            </View>)}
            <TouchableOpacity disabled={disabled} onPress={() => editor.pick(payment.id)}><Text style={{ color: '#159957' }}>Add Payment Proof</Text></TouchableOpacity>
        </View>)}
        <TouchableOpacity disabled={disabled} onPress={editor.add}><Text style={{ color: '#159957', fontWeight: '600' }}>Add Payment</Text></TouchableOpacity>
    </View>;
}
