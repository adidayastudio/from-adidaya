import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export function ExcludedRABItems({ items, onRestore, isDark, readOnly, note }: { items: { id: string; code: string; title: string }[]; onRestore: (id: string) => void; isDark: boolean; readOnly: boolean; note?: string }) {
    const [open, setOpen] = useState(false);
    if (!items.length) return null;
    const muted = isDark ? '#9898A2' : '#73737D';
    return <View style={{ gap: 8, paddingVertical: 8 }}>
        <TouchableOpacity onPress={() => setOpen(value => !value)} style={{ flexDirection: 'row', gap: 7, alignItems: 'center', alignSelf: 'flex-start' }}><Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={13} color={muted} /><Text style={{ color: muted, fontSize: 12 }}>Excluded items ({items.length})</Text></TouchableOpacity>
        {open && !!note && <Text style={{ color: muted, fontSize: 11, paddingHorizontal: 16 }}>{note}</Text>}
        {open && items.map(item => <View key={item.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}><Text style={{ flex: 1, color: muted, fontSize: 12 }}>{item.code} · {item.title}</Text><TouchableOpacity disabled={readOnly} accessibilityLabel={`Restore ${item.code} to RAB`} onPress={() => onRestore(item.id)} style={{ opacity: readOnly ? 0.4 : 1 }}><Text style={{ color: '#007AFF', fontSize: 12 }}>Restore</Text></TouchableOpacity></View>)}
    </View>;
}
