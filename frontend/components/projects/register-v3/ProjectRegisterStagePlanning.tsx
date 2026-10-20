import { stageMasterItems } from '@/lib/projectStageMastersV3';
import { applyKOMasterV3 } from '@/lib/projectKOMasterV3';
import { stageWorkCSV, stageWorkHTML, stageWorkRows } from '@/lib/legacy-stages/layout';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { addRegisterGroup, canDeleteRegisterGroup, deleteRegisterGroup, canDeleteRegisterWork, deleteRegisterWork, RegisterV3, REGISTER_CATEGORIES, registerGroups } from '@/lib/projectRegisterV3';
import { addPlanningWork, editPlanningItem, planningRows, planningWorkAction, renumberPlanningWork, REGISTER_PRIORITIES } from '@/lib/projectRegisterPlanningV3';

export function ProjectRegisterStagePlanning({state,stage,isDark,saving,onSave,onDirtyChange,onHeaderTrailingChange}:{state:RegisterV3;stage:string;isDark:boolean;saving:boolean;onSave:(value:RegisterV3)=>Promise<boolean>;onDirtyChange:(dirty:boolean)=>void;onHeaderTrailingChange?: (value:React.ReactNode)=>void}){
    const scrollRef=useRef<ScrollView>(null);
    const [draft,setDraft]=useState(state),[open,setOpen]=useState<string[]>(['G']),[search,setSearch]=useState(''),[searchOpen,setSearchOpen]=useState(false),[tableViewports,setTableViewports]=useState<Record<string,number>>({});
    const [weightTexts,setWeightTexts]=useState<Record<string,string>>({});
    const [message,setMessage]=useState('');
    const [groupEditor,setGroupEditor]=useState<{category:string;code:string;name:string}|null>(null);
    useEffect(()=>{setDraft(state);setWeightTexts({});},[state]);
    const dirty=!!groupEditor||JSON.stringify(draft)!==JSON.stringify(state);
    useEffect(()=>{onDirtyChange(dirty);},[dirty,onDirtyChange]);
    useEffect(()=>()=>onDirtyChange(false),[onDirtyChange]);
    useLayoutEffect(()=>{scrollRef.current?.scrollTo({y:0,animated:false});setOpen(['G']);setWeightTexts({});setGroupEditor(null);setSearch('');setSearchOpen(false);setMessage('');},[stage]);
    const color=isDark?'#FFFFFF':'#1C1C1E',secondary=isDark?'#AEAEB2':'#636366',card=isDark?'#1C1C1E':'#FFFFFF',border=isDark?'#303034':'#E5E5EA';
    const pill=useMemo(()=>({borderRadius:999,height:34,minWidth:34,paddingHorizontal:12,justifyContent:'center' as const,backgroundColor:card}),[card]);
    const sections=useMemo(()=>REGISTER_CATEGORIES.flatMap(cat=>cat.code==='M'?[{...cat,name:'MEP',children:['M','E','P']}]:[{...cat,children:[cat.code]}]),[]);
    const apply=(operation:()=>RegisterV3)=>{if(saving)return;try{let next=operation();for(const category of new Set(next.items.filter(item=>item.stage===stage).map(item=>item.category)))next=renumberPlanningWork(next,stage,category);setDraft(next);setMessage('');}catch(reason){setMessage(reason instanceof Error?reason.message:'Unable to change work.');}};
    const add=(category:string,group:string,relative?:string,placement='below')=>apply(()=>addPlanningWork(draft,stage,category,group,globalThis.crypto.randomUUID(),relative,placement));
    const cancel=useCallback(()=>{if(saving)return;setDraft(state);setWeightTexts({});setGroupEditor(null);setMessage('');},[saving,state]);
    const doSave=useCallback(async(revision=false)=>{if(groupEditor){setMessage('Add or cancel the new task first.');return;}if(Object.values(weightTexts).some(value=>value!==''&&!Number.isFinite(Number(value)))){setMessage('Enter a valid weight.');return;}const next=revision?{...draft,planningRevisions:[...(draft.planningRevisions||[]),{id:globalThis.crypto.randomUUID(),stage,createdAt:new Date().toISOString(),items:JSON.parse(JSON.stringify(draft.items.filter(item=>item.stage===stage)))}]}:draft;if(await onSave(next))setMessage(revision?'Stage revision saved.':'Saved');},[draft,onSave,stage,weightTexts,groupEditor]);
    const exportWork=useCallback(async(format:'csv'|'xls'|'pdf')=>{
        try {
            const layout={ sections: sections.flatMap(section=>section.children.map(code=>({code,title:`${stage}${code}`,weight:draft.items.filter(item=>item.stage===stage&&item.category===code&&!item.excluded).reduce((sum,item)=>sum+(item.weight||0),0)}))), tasks:draft.items.filter(item=>item.stage===stage&&!item.excluded).map(item=>({id:item.id,code:item.code,name:item.title,nameId:item.titleId||'',weight:item.weight||0,priority:item.priority||'medium' as const,stage,sectionCode:item.category,parentId:item.parentId})) };
            const filename=`${stage}-stages-v3.${format}`;
            if(format==='pdf'){
                const print=await import('expo-print');const html=stageWorkHTML(layout,stage);
                if(Platform.OS==='web')await print.printAsync({html});
                else { const file=await print.printToFileAsync({html}); const sharing=await import('expo-sharing');await sharing.shareAsync(file.uri,{mimeType:'application/pdf'}); }
                return;
            }
            let content=stageWorkCSV(layout),mime='text/csv;charset=utf-8';
            if(format==='xls'){
                const xlsx=await import('xlsx');const workbook=xlsx.utils.book_new();xlsx.utils.book_append_sheet(workbook,xlsx.utils.aoa_to_sheet(stageWorkRows(layout)),stage);
                if(Platform.OS==='web'){xlsx.writeFile(workbook,filename,{bookType:'biff8'});return;}
                content=xlsx.write(workbook,{type:'base64',bookType:'biff8'});mime='application/vnd.ms-excel';
            }
            if(Platform.OS==='web'){const url=URL.createObjectURL(new Blob([content],{type:mime}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);}
            else {const fs=await import('expo-file-system/legacy');const sharing=await import('expo-sharing');const file=`${fs.cacheDirectory}${filename}`;await fs.writeAsStringAsync(file,content,{encoding:format==='xls'?fs.EncodingType.Base64:fs.EncodingType.UTF8});await sharing.shareAsync(file,{mimeType:mime.split(';')[0]});}
        }catch(reason){setMessage(reason instanceof Error?reason.message:'Export failed.');}
    },[draft,stage,sections]);
    const masterExamples=stageMasterItems(stage);
    const allOpen=sections.every(section=>open.includes(section.code));
    const toolbar=useMemo(()=><View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
        {searchOpen&&<TextInput autoFocus accessibilityLabel="Search work" placeholder="Search work" placeholderTextColor={secondary} value={search} onChangeText={setSearch} style={{...pill,color,width:190}}/>}
        <TouchableOpacity accessibilityLabel="Search work" style={{...pill,width:34,paddingHorizontal:0,alignItems:'center'}} onPress={()=>setSearchOpen(value=>!value)}><Ionicons name="search-outline" size={17} color={color}/></TouchableOpacity>
        <TouchableOpacity accessibilityLabel={allOpen?'Collapse all':'Expand all'} style={{...pill,width:34,paddingHorizontal:0,alignItems:'center'}} onPress={()=>setOpen(allOpen?[]:sections.map(section=>section.code))}><Ionicons name={allOpen?'contract-outline':'expand-outline'} size={17} color={color}/></TouchableOpacity>
        <ContextMenu title="Export" dropdownMenuMode actions={['CSV','XLS','PDF'].map(title=>({title}))} onPress={event=>void exportWork((['csv','xls','pdf'] as const)[event.nativeEvent.index])}><View style={{...pill,flexDirection:'row',alignItems:'center',gap:7}}><Ionicons name="share-outline" size={16} color={color}/><Text style={{color,fontSize:12,fontWeight:'500'}}>Export</Text></View></ContextMenu>
        {dirty&&<><TouchableOpacity disabled={saving} style={pill} onPress={cancel}><Text style={{color,fontSize:12}}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving} style={{...pill,backgroundColor:'#007AFF'}} onPress={()=>void doSave()}><Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'600'}}>{saving?'Saving…':'Save'}</Text></TouchableOpacity></>}
        <TouchableOpacity disabled={saving} style={{...pill,backgroundColor:'#007AFF'}} onPress={()=>void doSave(true)}><Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'600'}}>+ Add Revision</Text></TouchableOpacity>
        {!!draft.planningRevisions?.some(revision=>revision.stage===stage)&&<ContextMenu title="Stage revisions" dropdownMenuMode actions={draft.planningRevisions.filter(revision=>revision.stage===stage).map((revision,index)=>({title:`Revision ${index+1} · ${revision.createdAt.slice(0,10)}`}))} onPress={event=>{const snapshot=draft.planningRevisions!.filter(revision=>revision.stage===stage)[event.nativeEvent.index];if(!snapshot)return;setDraft(current=>({...current,items:current.items.map(item=>{if(item.stage!==stage)return item;const old=snapshot.items.find(row=>row.id===item.id);return old?{...item,title:old.title,titleId:old.titleId,weight:old.weight,priority:old.priority,parentId:old.parentId,position:old.position,excluded:old.excluded}:{...item,excluded:true};})}));}}><View style={pill}><Ionicons name="time-outline" size={17} color={color}/></View></ContextMenu>}
    </View>,[searchOpen,search,pill,color,secondary,allOpen,sections,saving,doSave,exportWork,draft.planningRevisions,stage,dirty,cancel]);
    useLayoutEffect(()=>{onHeaderTrailingChange?.(toolbar);},[toolbar,onHeaderTrailingChange]);
    const input={color,fontFamily:'System',fontSize:12,paddingHorizontal:8,paddingVertical:6,borderRadius:8,minHeight:32};
    return <ScrollView ref={scrollRef} contentContainerStyle={{padding:24,gap:12,paddingBottom:60,maxWidth:960,width:'100%',alignSelf:'center'}} keyboardShouldPersistTaps="handled">
        {!onHeaderTrailingChange&&toolbar}
        {!!message&&<Text style={{color:message.includes('saved')||message==='Saved'?secondary:'#FF9500'}}>{message}</Text>}
        {sections.map(section=>{
            const matches=draft.items.filter(item=>item.stage===stage&&section.children.includes(item.category)&&!item.excluded);
            const query=search.trim().toLowerCase();
            const sectionMatch=`${stage}${section.code} ${section.name}`.toLowerCase().includes(query);
            if(query&&!sectionMatch&&!matches.some(item=>`${item.code} ${item.title} ${item.titleId||''}`.toLowerCase().includes(query)))return null;
            const expanded=open.includes(section.code)||!!query;
            const weight=matches.filter(item=>!item.parentId).reduce((sum,item)=>sum+(item.weight||0),0);
            return <View key={section.code} style={{backgroundColor:card,borderRadius:18,overflow:'hidden'}}>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setOpen(value=>value.includes(section.code)?value.filter(code=>code!==section.code):[...value,section.code])} style={{flexDirection:'row',gap:10,alignItems:'center',padding:12}}>
                    <Text style={{color:'#007AFF',backgroundColor:isDark?'#122745':'#E5EFFF',borderRadius:999,paddingHorizontal:9,paddingVertical:5,fontSize:11,fontWeight:'700'}}>{stage}{section.code}</Text>
                    <Text style={{color,flex:1,fontWeight:'700',fontSize:14}}>{section.name}</Text><Text style={{color:secondary,fontSize:12}}>{weight.toFixed(2)}</Text><Ionicons name={expanded?'chevron-up':'chevron-down'} size={15} color={secondary}/>
                </TouchableOpacity>
                {expanded&&section.children.map(packageCode=>{
                    const tasks=planningRows(draft,stage,packageCode).filter(item=>!query||sectionMatch||`${item.code} ${item.title} ${item.titleId||''}`.toLowerCase().includes(query));
                    const groups=registerGroups(packageCode,draft,stage);
                    const viewport=tableViewports[packageCode]||724;
                    const tableWidth=Math.max(700,Math.floor(viewport)-24),nameWidth=(tableWidth-316)/2;
                    return <View key={packageCode}>
                        {section.code==='M'&&<Text style={{color:secondary,fontSize:12,padding:12,fontWeight:'600'}}>{stage}{packageCode} · {packageCode==='M'?'Mechanical':packageCode==='E'?'Electrical':'Plumbing'}</Text>}
                        <ScrollView horizontal scrollEnabled={viewport<724} showsHorizontalScrollIndicator={viewport<724} onLayout={event=>{const measured=event.nativeEvent.layout.width;setTableViewports(current=>current[packageCode]===measured?current:{...current,[packageCode]:measured});}}><View style={{width:tableWidth,flexShrink:0,marginHorizontal:12}}>
                            <View style={{flexDirection:'row',paddingVertical:8,borderBottomWidth:1,borderColor:border}}>{[['Code',110],['Work (EN)',nameWidth],['Work (ID)',nameWidth],['Weight',60],['Priority',104],['',42]].map(([label,size])=><Text key={label} style={{width:Number(size),color:secondary,fontSize:11,fontWeight:'600'}}>{label}</Text>)}</View>
                            {tasks.map((task,index)=><React.Fragment key={task.id}>
                                {(index===0||tasks[index-1].group!==task.group)&&<View style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:1,borderColor:border}}><Text style={{width:110,color:'#007AFF',fontSize:12,fontWeight:'700'}}>{stage}{packageCode}-{task.group}</Text><Text style={{flex:1,color,fontSize:12,fontWeight:'700'}}>{groups.find(group=>group.code===task.group)?.name||`Task ${task.group}`}</Text><TouchableOpacity disabled={saving} onPress={()=>add(packageCode,task.group)} style={pill}><Text style={{color:'#007AFF',fontSize:12}}>＋ Add Subtask</Text></TouchableOpacity></View>}
                                <View style={{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:border,paddingVertical:3}}>
                                <Text style={{width:110,color:secondary,fontSize:11,paddingLeft:Math.max(0,task.sequence.split('-').length-1)*8}}>{task.code}</Text>
                                <TextInput editable={!saving} accessibilityLabel={`${task.code} English name`} value={task.title} onChangeText={title=>apply(()=>editPlanningItem(draft,task.id,{title}))} style={{...input,width:nameWidth,fontWeight:'600'}}/>
                                <TextInput editable={!saving} accessibilityLabel={`${task.code} Indonesian name`} value={task.titleId||''} onChangeText={titleId=>apply(()=>editPlanningItem(draft,task.id,{titleId}))} style={{...input,width:nameWidth,fontStyle:'italic',color:secondary}}/>
                                <TextInput editable={!saving} accessibilityLabel={`${task.code} weight`} keyboardType="numeric" value={weightTexts[task.id]??String(task.weight||0)} onChangeText={value=>{if(/^\d*(\.\d*)?$/.test(value)){setWeightTexts(current=>({...current,[task.id]:value}));apply(()=>editPlanningItem(draft,task.id,{weight:Number(value)||0}));}}} style={{...input,width:60,textAlign:'right'}}/>
                                <ContextMenu title="Priority" style={{width:104,height:32}} disabled={saving} dropdownMenuMode actions={REGISTER_PRIORITIES.map(priority=>({title:priority[0].toUpperCase()+priority.slice(1),selected:priority===(task.priority||'medium')}))} onPress={event=>apply(()=>editPlanningItem(draft,task.id,{priority:REGISTER_PRIORITIES[event.nativeEvent.index]}))}><View style={{width:96,marginHorizontal:4,minHeight:32,paddingHorizontal:10,borderRadius:999,backgroundColor:isDark?'#2C2C2E':'#F2F2F7',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6}}><Text style={{fontSize:11,fontWeight:'600',textTransform:'capitalize',color:task.priority==='urgent'?'#FF3B30':task.priority==='high'?'#FF9500':color}}>{task.priority||'medium'}</Text><Ionicons name="chevron-down" size={12} color={secondary}/></View></ContextMenu>
                                <ContextMenu title="Work actions" style={{width:42,height:32}} disabled={saving} dropdownMenuMode actions={['Add Above','Add Below','Add Subtask','Move Up','Move Down','Exclude Work & Subtasks',...(canDeleteRegisterWork(draft,task.id)?['Delete Work']:[])].map((title,index)=>({title,destructive:index>=5}))} onPress={event=>{const index=event.nativeEvent.index;if(index===6){apply(()=>deleteRegisterWork(draft,task.id));return;}if(index<3)add(packageCode,task.group,task.id,['above','below','subtask'][index]);else apply(()=>planningWorkAction(draft,task.id,index===3?'up':index===4?'down':'exclude'));}}><View style={{width:32,height:32,marginHorizontal:5,borderRadius:16,backgroundColor:isDark?'#2C2C2E':'#F2F2F7',alignItems:'center',justifyContent:'center'}}><Ionicons name="ellipsis-horizontal" size={18} color={color}/></View></ContextMenu>
                            </View></React.Fragment>)}
                            {groups.filter(group=>!draft.items.some(item=>item.stage===stage&&item.category===packageCode&&item.group===group.code)&&draft.groups.some(row=>row.stage===stage&&row.category===packageCode&&row.code===group.code)).map(group=><View key={`group-${group.code}`} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:1,borderColor:border}}>
                                <Text style={{width:110,color:secondary,fontSize:11}}>{stage}{packageCode}-{group.code}</Text>
                                <Text style={{flex:1,color,fontSize:12,fontWeight:'600'}}>{group.name}</Text>
                                <Text style={{color:secondary,fontSize:11}}>No subtasks yet</Text>
                                <TouchableOpacity disabled={saving} onPress={()=>add(packageCode,group.code)} style={pill}><Text style={{color:'#007AFF',fontSize:12}}>＋ Add Subtask</Text></TouchableOpacity>
                                {canDeleteRegisterGroup(draft,stage,packageCode,group.code)&&<ContextMenu title="Task actions" dropdownMenuMode disabled={saving} actions={[{title:'Delete Task',destructive:true}]} onPress={()=>apply(()=>deleteRegisterGroup(draft,stage,packageCode,group.code))}><View style={{...pill,paddingHorizontal:8}}><Ionicons name="ellipsis-horizontal" size={18} color={color}/></View></ContextMenu>}
                            </View>)}
                        </View></ScrollView>
                        <View style={{flexDirection:'row',gap:16,padding:12}}>
                            <ContextMenu title="Add subtask · choose task" dropdownMenuMode disabled={saving} actions={(groups.length?groups:[{code:'01',name:'Work'}]).map(group=>({title:`${stage}${packageCode}-${group.code} · ${group.name}`}))} onPress={event=>add(packageCode,(groups.length?groups:[{code:'01'}])[event.nativeEvent.index].code)}><View><Text style={{color:'#007AFF',fontSize:12}}>＋ Add Subtask</Text></View></ContextMenu>
                            <ContextMenu title="Master examples" dropdownMenuMode disabled={saving} actions={masterExamples.filter(item=>item.code.startsWith(`${stage}${packageCode}-`)).map(item=>({title:item.title,disabled:draft.items.some(row=>row.code===item.code)}))} onPress={event=>{const item=masterExamples.filter(item=>item.code.startsWith(`${stage}${packageCode}-`))[event.nativeEvent.index];if(item&&stage==='KO'){apply(()=>applyKOMasterV3(draft,()=>globalThis.crypto.randomUUID(),[item.code]));return;}if(item)apply(()=>{const id=globalThis.crypto.randomUUID();return editPlanningItem(addPlanningWork(draft,stage,packageCode,item.code.split('-')[1],id),id,{title:item.title,masterSourceKey:`example:${item.code}`});});}}><View><Text style={{color:secondary,fontSize:12}}>From master</Text></View></ContextMenu>
                            <TouchableOpacity disabled={saving} onPress={()=>{const existing=new Set(groups.map(group=>group.code));const available=Array.from({length:99},(_,index)=>String(index+1).padStart(2,'0')).find(code=>!existing.has(code));setGroupEditor({category:packageCode,code:available||'',name:''});setMessage('');}}><Text style={{color:'#007AFF',fontSize:12}}>＋ Add Task</Text></TouchableOpacity>
                        </View>
                        {groupEditor?.category===packageCode&&<View style={{padding:12,gap:8}}>
                            <View style={{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                                <Text style={{color:secondary,fontSize:12}}>{stage}{packageCode}-</Text>
                                <TextInput editable={!saving} accessibilityLabel="New task number" placeholder="03" value={groupEditor.code} onChangeText={code=>setGroupEditor({...groupEditor,code:code.replace(/\D/g,'').slice(0,2)})} keyboardType="numeric" maxLength={2} style={{...input,backgroundColor:card,borderWidth:1,borderColor:border,borderRadius:999,width:60}}/>
                                <TextInput editable={!saving} accessibilityLabel="New task name" placeholder="Task name" placeholderTextColor={secondary} value={groupEditor.name} onChangeText={name=>setGroupEditor({...groupEditor,name})} style={{...input,borderWidth:1,borderColor:border,borderRadius:999,flex:1,minWidth:140}}/>
                                <TouchableOpacity disabled={saving} onPress={()=>{setGroupEditor(null);setMessage('');}} style={pill}><Text style={{color,fontSize:12}}>Cancel</Text></TouchableOpacity>
                                <TouchableOpacity disabled={saving} onPress={()=>apply(()=>{const next=addRegisterGroup(draft,stage,packageCode,groupEditor.code,groupEditor.name);setGroupEditor(null);return next;})} style={{...pill,backgroundColor:'#007AFF'}}><Text style={{color:'#FFFFFF',fontSize:12}}>Add Task</Text></TouchableOpacity>
                            </View>
                        </View>}
                    </View>;
                })}
            </View>;
        })}
        {draft.items.some(item=>item.stage===stage&&item.excluded)&&<ContextMenu title="Restore excluded work" dropdownMenuMode actions={draft.items.filter(item=>item.stage===stage&&item.excluded).map(item=>({title:`${item.code} · ${item.title}`}))} onPress={event=>{const item=draft.items.filter(item=>item.stage===stage&&item.excluded)[event.nativeEvent.index];if(item)apply(()=>({...draft,items:draft.items.map(row=>row.id===item.id?{...row,excluded:false,parentId:undefined}:row)}));}}><View style={pill}><Text style={{color:'#007AFF'}}>Excluded work · Restore</Text></View></ContextMenu>}
        {dirty&&<View style={{alignSelf:'flex-end',flexDirection:'row',alignItems:'center',gap:8}}><TouchableOpacity disabled={saving} onPress={cancel} style={pill}><Text style={{color,fontSize:12}}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={saving} onPress={()=>void doSave()} style={{backgroundColor:'#007AFF',borderRadius:999,paddingHorizontal:28,paddingVertical:14}}><Text style={{color:'#FFFFFF',fontWeight:'700'}}>{saving?'Saving…':'Save'}</Text></TouchableOpacity></View>}
    </ScrollView>;
}
