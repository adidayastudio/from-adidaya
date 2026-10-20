import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { DocumentBlock } from '@/lib/projectDocumentTemplates';

function Paragraph({ block, table, readOnly, onChange }: { block: DocumentBlock; table: boolean; readOnly: boolean; onChange: (text: string) => void }) {
    const [height, setHeight] = useState(0);
    const title = block.heading === 'HEADING_1';
    const heading = title || block.heading?.startsWith('HEADING_') || /^\d{2}\s*[—–]/.test(block.text || '');
    return <TextInput accessibilityLabel={block.text?.slice(0, 70) || 'Document field'} multiline editable={!readOnly} value={block.text || ''} placeholder={table ? 'Enter details…' : ''} placeholderTextColor="#A1A1AA" onChangeText={onChange} onContentSizeChange={event => setHeight(event.nativeEvent.contentSize.height)} style={{ color: '#18181B', fontSize: title ? 25 : heading ? 17 : 14, lineHeight: title ? 32 : heading ? 25 : 22, fontWeight: heading || block.bold ? '700' : '400', fontStyle: block.italic ? 'italic' : 'normal', minHeight: table ? 32 : 26, height: height || undefined, textAlignVertical: 'top', padding: table ? 6 : 0, marginTop: !table && heading ? 18 : 0, marginBottom: !table ? 5 : 0, width: '100%' }} />;
}

export function TemplateDocumentPage({ blocks, onChange, readOnly = false, nested = false }: { blocks: DocumentBlock[]; onChange: (blocks: DocumentBlock[]) => void; readOnly?: boolean; nested?: boolean }) {
    const update = (index: number, block: DocumentBlock) => onChange(blocks.map((old, i) => i === index ? block : old));
    return <View style={nested ? undefined : { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 850, alignSelf: 'center', borderRadius: 4, borderWidth: 1, borderColor: '#E4E4E7', paddingHorizontal: 48, paddingVertical: 32, marginBottom: 28 }}>
        {blocks.map((block, index) => block.type === 'rule' ? <View key={index} style={{ height: 1, backgroundColor: '#D4D4D8', marginVertical: 20 }} /> : block.type === 'table' ? <View key={index} style={{ borderWidth: 1, borderColor: '#D4D4D8', marginVertical: 12 }}>
            {block.rows?.map((row, rowIndex) => <View key={rowIndex} style={{ flexDirection: 'row', borderTopWidth: rowIndex ? 1 : 0, borderColor: '#D4D4D8', backgroundColor: rowIndex === 0 ? '#F4F4F5' : '#FFFFFF' }}>
                {row.map((cell, cellIndex) => <View key={cellIndex} style={{ flex: block.widths?.[cellIndex] || 1, minWidth: 0, borderLeftWidth: cellIndex ? 1 : 0, borderColor: '#D4D4D8', padding: 6 }}>
                    <TemplateDocumentPage nested readOnly={readOnly} blocks={cell.blocks.length ? cell.blocks : [{ type: 'paragraph', text: '' }]} onChange={next => update(index, { ...block, rows: block.rows!.map((oldRow, ri) => ri !== rowIndex ? oldRow : oldRow.map((oldCell, ci) => ci !== cellIndex ? oldCell : { ...cell, blocks: next })) })} />
                </View>)}
            </View>)}
        </View> : <Paragraph key={index} block={block} table={nested} readOnly={readOnly} onChange={text => update(index, { ...block, text })} />)}
    </View>;
}
