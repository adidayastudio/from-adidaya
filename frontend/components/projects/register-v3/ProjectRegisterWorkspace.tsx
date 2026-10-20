import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { ProjectRegisterTree } from './ProjectRegisterTree';
import { registerTreeSections } from '@/lib/projectRegisterTreeV3';
import { addPlanningWork, editPlanningItem } from '@/lib/projectRegisterPlanningV3';
import { ProjectRegisterStagePlanning } from './ProjectRegisterStagePlanning';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { loadProjectRegisterV3, saveProjectRegisterV3 } from '@/lib/api/projectRegisterV3';
import { REGISTER_STAGES, RegisterItem, RegisterStatus, RegisterV3,  emptyRegister, publishRegisterItem, registerItemStatus, reviseRegisterItem, updateRegisterItem } from '@/lib/projectRegisterV3';
type Mode = 'planning' | 'work' | 'documents';
const statuses: RegisterStatus[] = ['Not Started', 'Draft', 'In Progress', 'In Review', 'Approved'];
export function ProjectRegisterWorkspace({ projectId, mode, isDark, onHeaderTrailingChange, onTitleAccessoryChange, onDirtyChange, onNavigate }: {
    projectId: string;
    mode: Mode;
    isDark: boolean;
    onHeaderTrailingChange?: (content: React.ReactNode) => void;
    onTitleAccessoryChange?: (content: React.ReactNode) => void;
    onDirtyChange?: (value: boolean) => void;
    onNavigate?: (section: string) => void;
}) {
    const navigationRef=useRef(onNavigate);
    useLayoutEffect(()=>{navigationRef.current=onNavigate;},[onNavigate]);
    const navigate=useCallback((section:string)=>navigationRef.current?.(section),[]);
    const [state, setState] = useState<RegisterV3>(emptyRegister), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState('');
    const [stage, setStage] = useState('KO'), [category, setCategory] = useState(''), [mep, setMep] = useState('M'), [search, setSearch] = useState(''), [searchOpen, setSearchOpen] = useState(false);
    const [adding, setAdding] = useState(false), [title, setTitle] = useState(''), [group, setGroup] = useState('01');
    const [treeExpanded,setTreeExpanded]=useState<string[]>(['KOG','KOG-01','KOG-02']);
    const [documentStage,setDocumentStage]=useState('');
    const [documentSort,setDocumentSort]=useState<'code'|'name'|'latest'>('code');
    const [planningDirty, setPlanningDirty] = useState(false);
    const [editor, setEditor] = useState<RegisterItem | null>(null), [historyId, setHistoryId] = useState(''), [retry, setRetry] = useState(0);
    const color = isDark ? '#F5F5F7' : '#1C1C1E', secondary = isDark ? '#9898A2' : '#636366', surface = isDark ? '#1C1C1E' : '#FFFFFF', border = isDark ? '#303034' : '#E5E5EA';
    const pill = useMemo(() => ({ borderRadius: 999, backgroundColor: surface, paddingHorizontal: 14, paddingVertical: 10 }), [surface]);
    const actualCategory = editor?.category || (category === 'M' ? mep : category);
    const treeKeys=useMemo(()=>{const stages=mode==='documents'?REGISTER_STAGES.filter(item=>!documentStage||item.code===documentStage).map(item=>item.code):[stage];return stages.flatMap(code=>[...(mode==='documents'?[code]:[]),...registerTreeSections(state,code,'',mode==='documents').flatMap(section=>[section.code,...section.tasks.map(task=>task.code)])]);},[mode,documentStage,stage,state]);
    const allTreeOpen=treeKeys.length>0&&treeKeys.every(code=>treeExpanded.includes(code));
    const toggleTree=(code:string)=>setTreeExpanded(current=>current.includes(code)?current.filter(value=>value!==code):[...current,code]);
    useLayoutEffect(()=>{setTreeExpanded(mode==='documents'?[]:[`${stage}G`,`${stage}G-01`,`${stage}G-02`]);},[stage,mode]);
    useEffect(() => { let active = true; setLoading(true); setError(''); loadProjectRegisterV3(projectId).then(value => { if (active)
        setState(value); }).catch(reason => { if (active)
        setError(reason.message); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [projectId, retry]);
    useEffect(() => { onDirtyChange?.(!!editor || adding || planningDirty); }, [editor, adding, planningDirty, onDirtyChange]);
    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
    const persist = useCallback(async (next: RegisterV3) => { setSaving(true); setError(''); try {
        await saveProjectRegisterV3(projectId, state, next);
        setState(next);
        return true;
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to save.');
        return false;
    }
    finally {
        setSaving(false);
    } }, [projectId, state]);
    const run = async (operation: () => RegisterV3) => { try {
        return await persist(operation());
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to save.');
        return false;
    } };
    const planningDirtyChanged = useCallback((dirty: boolean) => { setPlanningDirty(dirty); if (!dirty) setError(current => current === 'Save or cancel your changes before switching stages.' ? '' : current); }, []);
    const changeStage = useCallback((value: string) => { if (editor || adding || planningDirty) { setError('Save or cancel your changes before switching stages.'); return; } setStage(value); setCategory(''); setSearch(''); }, [editor, adding, planningDirty]);
    useLayoutEffect(() => { onTitleAccessoryChange?.(mode==='documents'?null:<SegmentedControl compact animationType="timing" equalWidth style={{width:280}} segments={REGISTER_STAGES.map(item => ({ id: item.code, label: item.code }))} activeSegment={stage} onSegmentChange={changeStage}/>); }, [stage, changeStage, onTitleAccessoryChange, mode, projectId]);
    const toolbar = useMemo(() => mode==='documents'?<View style={{flexDirection:'row',alignItems:'center',gap:8}}>{searchOpen&&<TextInput autoFocus accessibilityLabel="Search documents" placeholder="Search folders or documents" placeholderTextColor={secondary} value={search} onChangeText={setSearch} style={{...pill,width:190,color}}/>}<HeaderToolbar isDark={isDark} textColor={color} maxDirectActions={5} actions={[{id:'search',icon:'search-outline',title:'Search documents',onPress:()=>{setSearchOpen(value=>!value);setSearch('');}},{id:'expand',icon:allTreeOpen?'contract-outline':'expand-outline',title:allTreeOpen?'Collapse all':'Expand all',onPress:()=>setTreeExpanded(allTreeOpen?[]:treeKeys)},{id:'filter',icon:'filter-outline',title:'Filter stage',tintColor:documentStage?'#007AFF':color,menuActions:[{title:'All stages',selected:!documentStage},...REGISTER_STAGES.map(item=>({title:`${item.code} · ${item.name}`,selected:documentStage===item.code}))],onMenuPress:event=>setDocumentStage(event.nativeEvent.index?REGISTER_STAGES[event.nativeEvent.index-1].code:'')},{id:'sort',icon:'swap-vertical-outline',title:'Sort documents',menuActions:['Code','Name','Latest issue'].map((title,index)=>({title,selected:documentSort===['code','name','latest'][index]})),onMenuPress:event=>setDocumentSort((['code','name','latest'] as const)[event.nativeEvent.index])},{id:'add',icon:'add',title:'Create document in Deliverables',isPrimary:true,onPress:()=>navigate('work')}]}/></View>:<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {searchOpen && <TextInput autoFocus accessibilityLabel="Search V3 register" value={search} onChangeText={setSearch} placeholder="Search register" placeholderTextColor={secondary} style={{ ...pill, width: 190, color }}/>}
        <TouchableOpacity accessibilityLabel="Search register" style={pill} onPress={() => { setSearchOpen(value => !value); setSearch(''); }}><Ionicons name="search-outline" size={17} color={color}/></TouchableOpacity>
        <TouchableOpacity accessibilityLabel={allTreeOpen ? 'Collapse all' : 'Expand all'} style={pill} onPress={() => setTreeExpanded(allTreeOpen?[]:treeKeys)}><Ionicons name={allTreeOpen ? 'contract-outline' : 'expand-outline'} size={17} color={color}/></TouchableOpacity>

    </View>, [searchOpen, search, secondary, pill, color, allTreeOpen, treeKeys, mode, documentStage, documentSort, navigate, isDark]);
    useLayoutEffect(() => { if (mode === 'planning') return; onHeaderTrailingChange?.(toolbar); }, [toolbar, onHeaderTrailingChange, mode]);
    useLayoutEffect(() => () => { onTitleAccessoryChange?.(null); onHeaderTrailingChange?.(null); }, [onTitleAccessoryChange, onHeaderTrailingChange]);
    const button = (label: string, action: () => void, primary = false, disabled = false) => <TouchableOpacity accessibilityRole="button" disabled={saving || disabled} onPress={action} style={{ ...pill,paddingVertical:8,paddingHorizontal:12, backgroundColor: primary ? '#007AFF' : surface, opacity: saving || disabled ? 0.45 : 1 }}><Text style={{ color: primary ? '#FFFFFF' : color, fontSize: 12, fontWeight: '600' }}>{label}</Text></TouchableOpacity>;
    const input = (label: string, value: string, onChange: (value: string) => void, multiline = false) => <View style={{ gap: 6, flex: multiline ? undefined : 1, minWidth: 120 }}><Text style={{ color: secondary, fontSize: 12 }}>{label}</Text><TextInput accessibilityLabel={label} editable={!saving && !locked} value={value} onChangeText={onChange} multiline={multiline} style={{ ...pill, color, minHeight: multiline ? 90 : 40, borderRadius: multiline ? 16 : 999, textAlignVertical: multiline ? 'top' : 'center' }}/></View>;
    const moduleSection = (value?: string) => value === 'Volume' ? 'planning:volume' : value === 'RAB' ? 'planning:rab' : value === 'Schedule' ? 'planning:schedule' : value === 'Report' ? 'planning:reports' : '';
    const linkedModules = actualCategory === 'B' ? ['Volume', 'RAB'] : actualCategory === 'T' ? ['Schedule'] : actualCategory === 'R' ? ['Report'] : [];
    const rowItem = (item: RegisterItem) => {
        const snapshot = mode === 'documents' ? item.versions.at(-1) : undefined;
        const history = item.versions;
        return <View key={item.id} style={{ borderTopWidth: 1, borderColor: border }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, paddingHorizontal: 12, flexWrap:'wrap' }}>
            <Text style={{ color: secondary, width: 105, fontSize: 12,marginLeft:mode==='work'?Math.max(0,item.sequence.split('-').length-1)*10:0 }}>{snapshot?.code || item.code}</Text>
            <TouchableOpacity style={{ flex: 1, minWidth: 160 }} onPress={() => { if (mode === 'documents') {
            setHistoryId(historyId === item.id ? '' : item.id);
        }
        else
            setEditor({ ...item }); }}><Text style={{ color, fontWeight: '500',fontSize:12 }}>{snapshot?.title || item.title}</Text>{!!item.pic && mode !== 'documents' && <Text style={{ color: secondary, fontSize: 12, marginTop: 4 }}>{item.pic}{item.deadline ? ` · ${item.deadline}` : ''}</Text>}</TouchableOpacity>
            <Text style={{ color: mode === 'documents' ? '#007AFF' : secondary, fontSize: 12, width: 82 }}>{mode === 'documents' ? 'Published' : registerItemStatus(item)}</Text>
            <Text style={{ color: secondary, fontSize: 12, width: 55 }}>Rev {snapshot?.revision || item.revision}</Text>
            {(snapshot?.url || item.url) && button('Open file', () => void Linking.openURL(snapshot?.url || item.url))}
            {button(mode === 'documents' ? 'Versions' : 'Edit', () => mode === 'documents' ? setHistoryId(historyId === item.id ? '' : item.id) : setEditor({ ...item }))}
        </View>
        {historyId === item.id && <View style={{ padding: 16, gap: 10 }}>{[...history].reverse().map(version => <View key={version.id} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}><Text style={{ color, flex: 1 }}>V{version.version} · Rev {version.revision} · {version.title}</Text><Text style={{ color: secondary, fontSize: 12 }}>{version.publishedAt.slice(0, 10)}{version === history.at(-1) ? ' · Latest' : ' · Superseded'}</Text>{!!version.url && button('Open', () => void Linking.openURL(version.url))}{!!version.relatedModule && <Text style={{ color: secondary }}>{version.relatedModule} · see record notes</Text>}</View>)}
            {button('Open in Tasks & Deliverables', () => onNavigate?.('work'))}
        </View>}
        </View>;
    };
    const locked = !!editor && editor.versions.at(-1)?.revision === editor.revision;
    if (mode === 'planning') return <View style={{ flex: 1 }}>
        {!onTitleAccessoryChange && <SegmentedControl compact animationType="timing" equalWidth style={{width:280}} segments={REGISTER_STAGES.map(item => ({id:item.code,label:item.code}))} activeSegment={stage} onSegmentChange={changeStage}/>}
        {!!error && <Text accessibilityRole="alert" style={{color:'#FF3B30',paddingHorizontal:20}}>{error}</Text>}
        {loading ? <ActivityIndicator color="#007AFF"/> : <ProjectRegisterStagePlanning state={state} stage={stage} isDark={isDark} saving={saving} onSave={persist} onDirtyChange={planningDirtyChanged} onHeaderTrailingChange={onHeaderTrailingChange}/>}

    </View>;
    if(mode==='documents'||(mode==='work'&&!editor))return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,gap:12,paddingBottom:60,maxWidth:960,width:'100%',alignSelf:'center'}}>
        {!onTitleAccessoryChange&&mode==='work'&&<SegmentedControl compact animationType="timing" equalWidth style={{width:280}} segments={REGISTER_STAGES.map(item=>({id:item.code,label:item.code}))} activeSegment={stage} onSegmentChange={changeStage}/>}
        {!onHeaderTrailingChange&&toolbar}
        {loading&&<ActivityIndicator color="#007AFF"/>}
        {!!error&&<View style={{gap:10}}><Text accessibilityRole="alert" style={{color:'#FF3B30'}}>{error}</Text>{!saving&&button('Reload register',()=>setRetry(value=>value+1))}</View>}
        {adding&&mode==='work'&&<View style={{backgroundColor:surface,borderRadius:18,padding:12,gap:12}}><Text style={{color,fontWeight:'600',fontSize:12}}>{stage}{actualCategory}-{group} · New deliverable</Text>{input('Title',title,setTitle)}<View style={{flexDirection:'row',gap:8}}>{button('Cancel',()=>{setAdding(false);setTitle('');setCategory('');})}{button('Add Deliverable',()=>void run(()=>{const id=globalThis.crypto.randomUUID();return editPlanningItem(addPlanningWork(state,stage,actualCategory,group,id),id,{title});}).then(ok=>{if(ok){setAdding(false);setTitle('');setCategory('');}}),true,loading)}</View></View>}
        {!loading&&<ProjectRegisterTree state={state} stage={mode==='documents'?documentStage:stage} isDark={isDark} documents={mode==='documents'} search={search} expanded={treeExpanded} onToggle={toggleTree} renderItem={rowItem} sort={documentSort} onAdd={mode==='work'?(code,task)=>{if(adding)return;setCategory(code==='E'||code==='P'?'M':code);if(['M','E','P'].includes(code))setMep(code);setGroup(task);setAdding(true);setTitle('');}:undefined}/>}
        {!loading&&mode==='work'&&!state.items.some(item=>item.stage===stage&&!item.excluded)&&<Text style={{color:secondary,fontSize:12}}>No deliverables yet.</Text>}
    </ScrollView>;
    return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,gap:12,paddingBottom:60,maxWidth:960,width:'100%',alignSelf:'center'}}>
        {!onHeaderTrailingChange&&toolbar}
        {!!error&&<Text accessibilityRole="alert" style={{color:'#FF3B30'}}>{error}</Text>}
        {editor && <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Text style={{ color, fontWeight: '700', flex: 1 }}>{editor.code} · Rev {editor.revision}</Text>{button('Cancel', () => setEditor(null))}{locked ? button('Create Revision', () => void run(() => reviseRegisterItem(state, editor.id)).then(ok => { if (ok)
            setEditor(null); })) : button('Save', () => void run(() => updateRegisterItem(state, editor)).then(ok => { if (ok)
            setEditor(null); }), true)}</View>
            {locked && <Text style={{ color: secondary }}>Published version. Create a revision to make changes.</Text>}
            {input('Title', editor.title, value => setEditor({ ...editor, title: value }))}
            <View style={{ flexDirection: 'row', gap: 12 }}>{input('PIC', editor.pic, value => setEditor({ ...editor, pic: value }))}{input('Deadline · YYYY-MM-DD', editor.deadline, value => setEditor({ ...editor, deadline: value }))}</View>
            {input('File / link · https://', editor.url, value => setEditor({ ...editor, url: value }))}
            {input('Notes / linked source reference', editor.notes, value => setEditor({ ...editor, notes: value }), true)}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Text style={{ color: secondary }}>Status</Text><ContextMenu dropdownMenuMode disabled={locked || saving} actions={statuses.map(value => ({ title: value, selected: value === editor.status }))} onPress={event => setEditor({ ...editor, status: statuses[event.nativeEvent.index] })}><View style={pill}><Text style={{ color }}>{editor.status} ⌄</Text></View></ContextMenu>
                {linkedModules.length > 0 && <ContextMenu dropdownMenuMode disabled={locked || saving} actions={[{ title: 'None' }, ...linkedModules.map(value => ({ title: value }))]} onPress={event => setEditor({ ...editor, relatedModule: event.nativeEvent.index ? linkedModules[event.nativeEvent.index - 1] : undefined })}><View style={pill}><Text style={{ color }}>Linked module: {editor.relatedModule || 'None'} ⌄</Text></View></ContextMenu>}
                {!!editor.relatedModule && button('Open module', () => onNavigate?.(moduleSection(editor.relatedModule)))}
            </View>
            {!locked && button('Publish approved item', () => void run(() => { let next = updateRegisterItem(state, editor); next = publishRegisterItem(next, editor.id, globalThis.crypto.randomUUID(), new Date().toISOString()); return next; }).then(ok => { if (ok)
            setEditor(null); }), true)}
            <Text style={{ color: secondary, fontSize: 12 }}>Publishing records the file link and issue details. Use a revision-specific file link; external file contents are not copied or frozen here.</Text>
        </View>}
    </ScrollView>;
}
