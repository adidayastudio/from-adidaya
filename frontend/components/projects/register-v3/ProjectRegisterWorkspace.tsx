import type {Project} from '@/lib/api/projects';
import {DeliverablePreview} from './DeliverablePreview';
import {PlatformDatePicker} from '@/components/people/member-profile/components/PlatformDatePicker';
import {useTenantContext} from '@/context/TenantContext';
import {supabase} from '@/lib/supabase';
import {DeliverablePICPicker} from './DeliverablePICPicker';
import type {DeliverablePerson} from '@/lib/projectDeliverablePIC';
import { DELIVERABLE_STATUS_PROGRESS, deliverableProgress,hasDeliverableChildren,itemDeliverableProgress,setDeliverableStatus } from '@/lib/projectDeliverableProgress';
import { DeliverableProgressBar } from './DeliverableProgressBar';
import { DeliverableEditorSheet } from './DeliverableEditorSheet';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { ProjectRegisterTree } from './ProjectRegisterTree';
import { registerTreeSections } from '@/lib/projectRegisterTreeV3';
import { addPlanningWork, editPlanningItem } from '@/lib/projectRegisterPlanningV3';
import { ProjectRegisterStagePlanning } from './ProjectRegisterStagePlanning';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { loadProjectRegisterV3, saveProjectRegisterV3 } from '@/lib/api/projectRegisterV3';
import { REGISTER_STAGES, RegisterItem, RegisterStatus, RegisterV3,  emptyRegister, publishRegisterItem, registerItemStatus, reviseRegisterItem, updateRegisterItem } from '@/lib/projectRegisterV3';
type Mode = 'planning' | 'work' | 'documents';
const statuses: RegisterStatus[] = ['Not Started', 'Draft', 'In Progress', 'In Review', 'Approved'];
export function ProjectRegisterWorkspace({ projectId, projectInfo={}, mode, isDark, onHeaderTrailingChange, onTitleAccessoryChange, onDirtyChange, onEditorActiveChange, onNavigate }: {
    projectId: string;
    projectInfo?: Partial<Project>;
    mode: Mode;
    isDark: boolean;
    onHeaderTrailingChange?: (content: React.ReactNode) => void;
    onTitleAccessoryChange?: (content: React.ReactNode) => void;
    onDirtyChange?: (value: boolean) => void;
    onEditorActiveChange?: (value:boolean)=>void;
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
    const {activeTenant}=useTenantContext();
    const [people,setPeople]=useState<DeliverablePerson[]>([]);
    const [documentEditing,setDocumentEditing]=useState(false);
    const [linkEditing,setLinkEditing]=useState(false),[notesExpanded,setNotesExpanded]=useState(false);
    useEffect(()=>{setLinkEditing(false);setNotesExpanded(false);},[editor?.id]);
    const editorIsOpen=!!editor;
    useEffect(()=>{onEditorActiveChange?.(editorIsOpen);return()=>onEditorActiveChange?.(false);},[editorIsOpen,onEditorActiveChange]);
    useEffect(()=>{if(!editor)setDocumentEditing(false);},[editor]);
    useEffect(()=>{let active=true;setPeople([]);const tenantId=activeTenant?.id;if(!tenantId||mode!=='work')return;
        (async()=>{const members=await supabase.from('tenant_members').select('user_id,status').eq('tenant_id',tenantId);if(members.error)throw members.error;
        const ids=[...new Set((members.data||[]).map(member=>member.user_id).filter(Boolean))];
        const [linked,scoped,workStatuses]=await Promise.all([ids.length?supabase.from('profiles').select('*').in('id',ids):Promise.resolve({data:[],error:null}),supabase.from('profiles').select('*').eq('tenant_id',tenantId),supabase.from('work_status').select('id,name')]);
        if(linked.error)throw linked.error;if(scoped.error)throw scoped.error;if(workStatuses.error)throw workStatuses.error;
        const profiles=new Map([...linked.data||[],...scoped.data||[]].map(profile=>[profile.id,profile]));
        const options=Array.from(profiles.values()).filter(profile=>{const membership=members.data?.find(member=>member.user_id===profile.id);const status=workStatuses.data?.find(value=>value.id===profile.work_status_id)?.name||profile.work_status||membership?.status||profile.status||'Active';return profile.include_in_performance!==false&&profile.account_type!=='system'&&String(status).toLowerCase()==='active';}).filter(profile=>!`${profile.full_name||''} ${profile.email||''}`.toLowerCase().match(/test_|testuser/)).map(profile=>({id:profile.id,name:profile.full_name||profile.display_name||profile.name||profile.username||profile.email?.split('@')[0]||'Team Member'})).sort((a,b)=>a.name.localeCompare(b.name));
        if(active)setPeople(options);})().catch(()=>{if(active)setError('Unable to load People for PIC. Please retry.');});return()=>{active=false;};
    },[activeTenant?.id,mode,retry]);
    const color = isDark ? '#F5F5F7' : '#1C1C1E', secondary = isDark ? '#9898A2' : '#636366', surface = isDark ? '#1C1C1E' : '#FFFFFF', border = isDark ? '#303034' : '#E5E5EA';
    const pill = useMemo(() => ({ borderRadius: 999, backgroundColor: surface, paddingHorizontal: 14, paddingVertical: 10 }), [surface]);
    const actualCategory = editor?.category || (category === 'M' ? mep : category);
    const treeKeys=useMemo(()=>{const stages=mode==='documents'?REGISTER_STAGES.filter(item=>!documentStage||item.code===documentStage).map(item=>item.code):[stage];return stages.flatMap(code=>[...(mode==='documents'?[code]:[]),...registerTreeSections(state,code,'',mode==='documents').flatMap(section=>[section.code,...section.tasks.map(task=>task.code)])]);},[mode,documentStage,stage,state]);
    const allTreeOpen=treeKeys.length>0&&treeKeys.every(code=>treeExpanded.includes(code));
    const toggleTree=(code:string)=>setTreeExpanded(current=>current.includes(code)?current.filter(value=>value!==code):[...current,code]);
    useLayoutEffect(()=>{setTreeExpanded(mode==='documents'?[]:[`${stage}G`,`${stage}G-01`,`${stage}G-02`]);},[stage,mode]);
    useLayoutEffect(()=>{setEditor(null);setAdding(false);setError('');},[mode,projectId]);
    useEffect(() => { let active = true; setLoading(true); setError(''); loadProjectRegisterV3(projectId).then(value => { if (active)
        setState(value); }).catch(reason => { if (active)
        setError(reason.message); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [projectId, retry]);
    const editorDirty=!!editor&&JSON.stringify(editor)!==JSON.stringify(state.items.find(item=>item.id===editor.id));
    useEffect(() => { onDirtyChange?.(editorDirty || adding || planningDirty); }, [editorDirty, adding, planningDirty, onDirtyChange]);
    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
    const savingRef=useRef(false);
    const persist = useCallback(async (next: RegisterV3) => { if(savingRef.current)return false;savingRef.current=true;setSaving(true); setError(''); try {
        await saveProjectRegisterV3(projectId, state, next);
        setState(next);
        return true;
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to save.');
        return false;
    }
    finally {
        savingRef.current=false;setSaving(false);
    } }, [projectId, state]);
    const run = async (operation: () => RegisterV3) => { try {
        return await persist(operation());
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Unable to save.');
        return false;
    } };
    const planningDirtyChanged = useCallback((dirty: boolean) => { setPlanningDirty(dirty); if (!dirty) setError(current => current === 'Save or cancel your changes before switching stages.' ? '' : current); }, []);
    const changeStage = useCallback((value: string) => { if (saving||editorDirty || adding || planningDirty) { setError('Save or cancel your changes before switching stages.'); return; } setEditor(null);setStage(value); setCategory(''); setSearch(''); }, [saving,editorDirty, adding, planningDirty]);
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
    const openEditor=(item:RegisterItem)=>{if(saving||editor?.id===item.id)return;if(editorDirty&&editor?.id!==item.id){if(Platform.OS==='web'){if(!window.confirm('Discard unsaved changes?'))return;}else{Alert.alert('Unsaved changes','Save or cancel your changes first.');return;}}setEditor({...item});};
    const closeEditor=()=>{if(saving)return;if(editorDirty){if(Platform.OS==='web'){if(!window.confirm('Discard unsaved changes?'))return;}else{Alert.alert('Unsaved changes','Discard your changes?',[{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:()=>setEditor(null)}]);return;}}setEditor(null);};
    const uploadFile=async()=>{if(!editor||locked||savingRef.current)return;const current=editor;
        savingRef.current=true;setSaving(true);setError('');
        try{const picker=await import('expo-document-picker');const result=await picker.getDocumentAsync({copyToCacheDirectory:true,multiple:false});if(result.canceled)return;
            const asset=result.assets[0];let body:Blob|ArrayBuffer;
            if(Platform.OS==='web'){body=asset.file||await (await fetch(asset.uri)).blob();}
            else{const fs=await import('expo-file-system/legacy');const {decode}=await import('base64-arraybuffer');body=decode(await fs.readAsStringAsync(asset.uri,{encoding:fs.EncodingType.Base64}));}
            const {uploadDeliverableFile}=await import('@/lib/api/projectDeliverableFile');
            const url=await uploadDeliverableFile(activeTenant?.id||'',projectId,current.id,asset.name,asset.mimeType||'',body);
            setEditor(value=>value?.id===current.id?{...value,url,fileName:asset.name}:value);setLinkEditing(false);
        }catch(reason){setError(reason instanceof Error?reason.message:'Unable to upload file.');}
        finally{savingRef.current=false;setSaving(false);}
    };
    const rowItem = (item: RegisterItem) => {
        if(mode==='work'){
            const derived=hasDeliverableChildren(state,item),published=registerItemStatus(item)==='Published';
            const label=derived?`${Math.round(itemDeliverableProgress(state,item))}%`:registerItemStatus(item);
            return <View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:10,marginHorizontal:12,paddingVertical:7,borderTopWidth:1,borderColor:border}}>
                <Text style={{width:110,color:secondary,fontSize:11,paddingLeft:Math.max(0,item.sequence.split('-').length-1)*8}}>{item.code}</Text>
                <TouchableOpacity accessibilityLabel={`Edit ${item.code}`} onPress={()=>openEditor(item)} style={{flex:1,minWidth:100}}><Text style={{color,fontSize:12,fontWeight:'600'}}>{item.title}</Text></TouchableOpacity>
                <ContextMenu title={derived?'Progress from subtasks':'Status'} dropdownMenuMode disabled={saving||!!editor||derived||published} actions={statuses.map(value=>({title:`${value} · ${DELIVERABLE_STATUS_PROGRESS[value]}%`,selected:value===item.status}))} onPress={event=>{const status=statuses[event.nativeEvent.index];if(status)void run(()=>setDeliverableStatus(state,item.id,status));}}><View accessibilityLabel={`${item.code} status`} style={{width:125,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4,paddingVertical:7,paddingHorizontal:8,backgroundColor:isDark?'#2C2C2E':'#F2F2F7',borderRadius:999}}><Text style={{color:label==='Approved'||published?'#159957':secondary,fontSize:11}}>{label}</Text>{!derived&&!published&&<Ionicons name="chevron-down" size={11} color={secondary}/>}</View></ContextMenu>
                <View style={{width:90}}><DeliverablePICPicker item={item} people={people} color={secondary} isDark={isDark} disabled={saving||!!editor||registerItemStatus(item)==='Published'} onChange={patch=>{void run(()=>updateRegisterItem(state,{...item,...patch}));}}/></View>

                <TouchableOpacity accessibilityLabel={`Open ${item.code} details`} disabled={saving} onPress={()=>openEditor(item)} style={{width:28,height:30,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-forward" size={15} color={secondary}/></TouchableOpacity>
            </View>;
        }
        const snapshot = mode === 'documents' ? item.versions.at(-1) : undefined;
        const history = item.versions;
        return <View key={item.id} style={{ borderTopWidth: 1, borderColor: border }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, paddingHorizontal: 12, flexWrap:'wrap' }}>
            <Text style={{ color: secondary, width: 105, fontSize: 12,marginLeft:0 }}>{snapshot?.code || item.code}</Text>
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
    const saveEditor=(publish=false)=>{if(!editor)return;let savedItem:RegisterItem|undefined;void run(()=>{let next=updateRegisterItem(state,editor);if(publish)next=publishRegisterItem(next,editor.id,globalThis.crypto.randomUUID(),new Date().toISOString());savedItem=next.items.find(item=>item.id===editor.id);return next;}).then(ok=>{if(ok&&savedItem)setEditor(savedItem);});};
    const locked = !!editor && editor.versions.at(-1)?.revision === editor.revision;
    const editorPanel=editor?<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,gap:12,paddingBottom:60,maxWidth:960,width:'100%',alignSelf:'center'}}>
        {!!error&&<Text accessibilityRole="alert" style={{color:'#FF3B30'}}>{error}</Text>}
        {editor && <View style={{ gap: 16 }}>
            <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8}}>
                <Text numberOfLines={1} style={{color,fontWeight:'700',width:'100%'}}>{editor.code} · Rev {editor.revision}</Text>
                {locked?button('Create Revision',()=>{let draft:RegisterItem|undefined;void run(()=>{const next=reviseRegisterItem(state,editor.id);draft=next.items.find(item=>item.id===editor.id);return next;}).then(ok=>{if(ok&&draft)setEditor(draft);});}):<ContextMenu title="Save" dropdownMenuMode disabled={saving} actions={[{title:'Save changes'},{title:'Publish',disabled:editor.status!=='Approved'}]} onPress={event=>saveEditor(event.nativeEvent.index===1)}><View style={{...pill,paddingVertical:8,paddingHorizontal:12,backgroundColor:'#007AFF',flexDirection:'row',alignItems:'center',gap:6,opacity:saving?0.45:1}}><Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'600'}}>Save</Text><Ionicons name="chevron-down" size={11} color="#FFFFFF"/></View></ContextMenu>}
                {!documentEditing&&<TouchableOpacity accessibilityRole="button" accessibilityLabel="Open editor" disabled={saving} onPress={()=>setDocumentEditing(true)} style={{...pill,paddingVertical:8,paddingHorizontal:12,flexDirection:'row',gap:6,alignItems:'center',backgroundColor:isDark?'#0A2038':'#E6EEFF',borderWidth:1,borderColor:'#007AFF'}}><Text style={{color:'#007AFF',fontSize:12,fontWeight:'600'}}>Open editor</Text><Feather name="arrow-up-right" size={15} color="#007AFF"/></TouchableOpacity>}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close detail" disabled={saving} onPress={closeEditor} style={{...pill,padding:8}}><Ionicons name="close" size={17} color={secondary}/></TouchableOpacity>
            </View>
            {locked && <Text style={{ color: secondary }}>Published version. Create a revision to make changes.</Text>}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Text style={{ color: secondary }}>Status</Text><ContextMenu dropdownMenuMode disabled={locked || saving || hasDeliverableChildren(state,editor)} actions={statuses.map(value => ({ title: `${value} · ${DELIVERABLE_STATUS_PROGRESS[value]}%`, selected: value === editor.status }))} onPress={event => setEditor({ ...editor, status: statuses[event.nativeEvent.index] })}><View style={pill}><Text style={{ color }}>{hasDeliverableChildren(state,editor)?`${Math.round(itemDeliverableProgress(state,editor))}% · Subtasks`:editor.status} ⌄</Text></View></ContextMenu>
                {linkedModules.length > 0 && <ContextMenu dropdownMenuMode disabled={locked || saving} actions={[{ title: 'None' }, ...linkedModules.map(value => ({ title: value }))]} onPress={event => setEditor({ ...editor, relatedModule: event.nativeEvent.index ? linkedModules[event.nativeEvent.index - 1] : undefined })}><View style={pill}><Text style={{ color }}>Linked module: {editor.relatedModule || 'None'} ⌄</Text></View></ContextMenu>}
                {!!editor.relatedModule && button('Open module', () => onNavigate?.(moduleSection(editor.relatedModule)))}
            </View>
            {input('Title', editor.title, value => setEditor({ ...editor, title: value }))}
            <View style={{ flexDirection: 'row', gap: 12 }}><View style={{flex:1,minWidth:120,gap:6}}><Text style={{color:secondary,fontSize:12}}>PIC</Text><DeliverablePICPicker field item={editor} people={people} color={secondary} isDark={isDark} disabled={saving||locked} onChange={patch=>setEditor({...editor,...patch})}/></View><View style={{flex:1,minWidth:120,gap:6}}><Text style={{color:secondary,fontSize:12}}>Deadline</Text><PlatformDatePicker accessibilityLabel="Deadline" pill disabled={saving||locked} isDark={isDark} textColor={color} value={editor.deadline?new Date(`${editor.deadline}T12:00:00`):new Date(NaN)} onChange={date=>setEditor({...editor,deadline:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`})} onClear={()=>setEditor({...editor,deadline:''})}/></View></View>
            <View style={{gap:6}}><Text style={{color:secondary,fontSize:12}}>Priority</Text><ContextMenu title="Priority" dropdownMenuMode disabled={saving||locked} actions={['Low','Medium','High','Urgent'].map(title=>({title,selected:editor.priority===title.toLowerCase()}))} onPress={event=>setEditor({...editor,priority:(['low','medium','high','urgent'] as const)[event.nativeEvent.index]})}><View style={{...pill,minHeight:40,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:editor.priority==='urgent'?'#FF3B30':editor.priority==='high'?'#FF9500':color}}>{editor.priority?editor.priority[0].toUpperCase()+editor.priority.slice(1):'Not set'}</Text><Ionicons name="chevron-down" size={12} color={secondary}/></View></ContextMenu></View>
            <View style={{padding:12,borderRadius:16,backgroundColor:surface,gap:10}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{color:secondary,fontSize:12,flex:1}}>File</Text>{button(editor.url?'Replace':'Upload',()=>void uploadFile(),false,locked)}{button('Add link',()=>setLinkEditing(value=>!value),false,locked)}</View>
                {!!editor.url&&!linkEditing&&<View style={{flexDirection:'row',alignItems:'center',gap:8}}><TouchableOpacity style={{flex:1}} onPress={()=>void Linking.openURL(editor.url)}><Text numberOfLines={1} style={{color:'#007AFF',fontSize:12}}>{editor.fileName||editor.url.split(/[?#]/)[0].split('/').pop()||'Attached file'}</Text></TouchableOpacity><TouchableOpacity accessibilityLabel="Remove file" disabled={saving||locked} onPress={()=>setEditor({...editor,url:'',fileName:undefined})}><Ionicons name="close" size={16} color={secondary}/></TouchableOpacity></View>}
                {linkEditing&&<View style={{gap:8}}>{input('Link',editor.url,url=>setEditor({...editor,url,fileName:undefined}))}{button('Done',()=>setLinkEditing(false))}</View>}
            </View>
            <View style={{gap:6}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{color:secondary,fontSize:12}}>Notes</Text><TouchableOpacity accessibilityLabel={notesExpanded?'Collapse notes':'Expand notes'} onPress={()=>setNotesExpanded(value=>!value)}><Ionicons name={notesExpanded?'contract-outline':'expand-outline'} size={14} color={secondary}/></TouchableOpacity></View><TextInput accessibilityLabel="Notes" editable={!saving&&!locked} multiline value={editor.notes} onChangeText={notes=>{setEditor({...editor,notes});if(notes.length>120||notes.split('\n').length>2)setNotesExpanded(true);}} style={{...pill,color,borderRadius:16,height:notesExpanded?120:44,textAlignVertical:'top'}}/></View>
            {documentEditing?<View style={{gap:16}}>{editor.title.toLowerCase().includes('cover')?input('Cover subtitle / Notes',editor.pageContent?.notes||'',notes=>setEditor({...editor,pageContent:{...editor.pageContent,notes}}),true):editor.title.toLowerCase().includes('contents')?<Text style={{color:secondary,fontSize:12}}>Table of contents follows the current stage items automatically.</Text>:<>{input('Document content',editor.pageContent?.description||'',description=>setEditor({...editor,pageContent:{...editor.pageContent,description}}),true)}{input('Attachments / Image URLs',editor.pageContent?.attachmentUrl||'',attachmentUrl=>setEditor({...editor,pageContent:{...editor.pageContent,attachmentUrl}}))}</>}</View>:null}
            {!documentEditing&&!linkEditing&&<DeliverablePreview key={editor.id} state={state} item={editor} project={projectInfo} isDark={isDark}/>}
        </View>}
    </ScrollView>:null;
    if(mode==='work'&&documentEditing&&editor&&Platform.OS==='web')return <View style={{flex:1,minHeight:0,flexDirection:'row'}}>
        <View style={{width:'36%',minWidth:300,maxWidth:440,borderRightWidth:1,borderColor:border,minHeight:0}}>
            <View style={{padding:16,gap:10}}>{button('Back to details',()=>setDocumentEditing(false))}<Text style={{color:secondary,fontSize:12}}>Deliverables</Text><ScrollView style={{maxHeight:150}}>{state.items.filter(item=>item.stage===stage&&!item.excluded).map(item=><TouchableOpacity key={item.id} disabled={saving} onPress={()=>openEditor(item)} style={{paddingVertical:8,paddingHorizontal:10,borderRadius:10,backgroundColor:item.id===editor.id?surface:'transparent'}}><Text style={{color:item.id===editor.id?'#007AFF':secondary,fontSize:12}}>{item.code} · {item.title}</Text></TouchableOpacity>)}</ScrollView></View>
            {editorPanel}
        </View>
        <ScrollView style={{flex:1,minWidth:0}} contentContainerStyle={{padding:24}}><DeliverablePreview key={editor.id} state={state} item={editor} project={projectInfo} isDark={isDark} showPage/></ScrollView>
    </View>;
    if (mode === 'planning') return <View style={{ flex: 1 }}>
        {!onTitleAccessoryChange && <SegmentedControl compact animationType="timing" equalWidth style={{width:280}} segments={REGISTER_STAGES.map(item => ({id:item.code,label:item.code}))} activeSegment={stage} onSegmentChange={changeStage}/>}
        {!!error && <Text accessibilityRole="alert" style={{color:'#FF3B30',paddingHorizontal:20}}>{error}</Text>}
        {loading ? <ActivityIndicator color="#007AFF"/> : <ProjectRegisterStagePlanning state={state} stage={stage} isDark={isDark} saving={saving} onSave={persist} onDirtyChange={planningDirtyChanged} onHeaderTrailingChange={onHeaderTrailingChange}/>}

    </View>;
    if(mode==='documents'||mode==='work')return <View style={{flex:1,minHeight:0,flexDirection:Platform.OS==='web'?'row':'column',overflow:'hidden'}}><ScrollView style={{flex:1,minWidth:0}} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,gap:12,paddingBottom:60,maxWidth:960,width:'100%',alignSelf:'center'}}>
        {!onTitleAccessoryChange&&mode==='work'&&<SegmentedControl compact animationType="timing" equalWidth style={{width:280}} segments={REGISTER_STAGES.map(item=>({id:item.code,label:item.code}))} activeSegment={stage} onSegmentChange={changeStage}/>}
        {!onHeaderTrailingChange&&toolbar}
        {loading&&<ActivityIndicator color="#007AFF"/>}
        {!!error&&<View style={{gap:10}}><Text accessibilityRole="alert" style={{color:'#FF3B30'}}>{error}</Text>{!saving&&button('Reload register',()=>setRetry(value=>value+1))}</View>}
        {!loading&&mode==='work'&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,padding:12,backgroundColor:surface,borderRadius:18}}><Text style={{color,fontSize:12,fontWeight:'600'}}>{stage} · Progress</Text><DeliverableProgressBar percent={deliverableProgress(state,stage).percent} isDark={isDark} width={160}/></View>}
        {adding&&mode==='work'&&<View style={{backgroundColor:surface,borderRadius:18,padding:12,gap:12}}><Text style={{color,fontWeight:'600',fontSize:12}}>{stage}{actualCategory}-{group} · New deliverable</Text>{input('Title',title,setTitle)}<View style={{flexDirection:'row',gap:8}}>{button('Cancel',()=>{setAdding(false);setTitle('');setCategory('');})}{button('Add Deliverable',()=>void run(()=>{const id=globalThis.crypto.randomUUID();return editPlanningItem(addPlanningWork(state,stage,actualCategory,group,id),id,{title});}).then(ok=>{if(ok){setAdding(false);setTitle('');setCategory('');}}),true,loading)}</View></View>}
        {!loading&&<ProjectRegisterTree state={state} stage={mode==='documents'?documentStage:stage} isDark={isDark} documents={mode==='documents'} search={search} expanded={treeExpanded} onToggle={toggleTree} renderItem={rowItem} sort={documentSort} onAdd={mode==='work'?(code,task)=>{if(adding)return;setCategory(code==='E'||code==='P'?'M':code);if(['M','E','P'].includes(code))setMep(code);setGroup(task);setAdding(true);setTitle('');}:undefined}/>}
        {!loading&&mode==='work'&&!state.items.some(item=>item.stage===stage&&!item.excluded)&&<Text style={{color:secondary,fontSize:12}}>No deliverables yet.</Text>}
    </ScrollView>{mode==='work'&&<DeliverableEditorSheet visible={!!editor} isDark={isDark} onClose={closeEditor} nativeEditor={{onUpload:()=>void uploadFile(),people,item:editor,saving,locked,parentProgress:editor&&hasDeliverableChildren(state,editor)?itemDeliverableProgress(state,editor):undefined,onChange:patch=>setEditor(current=>current?{...current,...patch}:current),onSave:()=>saveEditor(),onRevise:()=>{if(editor)void run(()=>reviseRegisterItem(state,editor.id)).then(ok=>{if(ok)setEditor(null);});},onPublish:()=>saveEditor(true)}}>{editorPanel}</DeliverableEditorSheet>}</View>;
    return null;
}