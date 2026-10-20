import { deliverableProgress } from '@/lib/projectDeliverableProgress';
import { DeliverableProgressBar } from './DeliverableProgressBar';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RegisterItem, RegisterV3, REGISTER_STAGES } from '@/lib/projectRegisterV3';
import { registerTreeSections } from '@/lib/projectRegisterTreeV3';

type Props={state:RegisterV3;stage:string;isDark:boolean;documents?:boolean;search:string;expanded:string[];onToggle:(code:string)=>void;renderItem:(item:RegisterItem)=>React.ReactNode;onAdd?:(category:string,task:string)=>void;sort?:'code'|'name'|'latest';};
export function ProjectRegisterTree({state,stage,isDark,documents=false,search,expanded,onToggle,renderItem,onAdd,sort='code'}:Props){
    const color=isDark?'#FFFFFF':'#1C1C1E',secondary=isDark?'#8E8E93':'#636366',border=isDark?'#303034':'#E5E5EA',surface=isDark?'#1C1C1E':'#FFFFFF';
    const isOpen=(code:string)=>!!search.trim()||expanded.includes(code);
    const folder=(code:string,name:string,count:number,depth:number)=> <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Toggle ${code}`} accessibilityState={{expanded:isOpen(code)}} onPress={()=>onToggle(code)} style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:13,paddingLeft:depth*24,borderBottomWidth:1,borderBottomColor:border}}><Ionicons name={isOpen(code)?'chevron-down':'chevron-forward'} size={15} color={secondary}/><Ionicons name={isOpen(code)?'folder-open-outline':'folder-outline'} size={22} color="#007AFF"/><Text style={{color,flex:1,fontWeight:depth?'500':'600'}}>{code} · {name}</Text><Text style={{color:secondary,fontSize:12}}>{count} documents</Text></TouchableOpacity>;
    const renderSections=(stageCode:string)=>registerTreeSections(state,stageCode,search,documents).map(section=>{
        const all=section.tasks.flatMap(task=>task.items),published=all.filter(item=>item.versions.length).length;
        const categories=section.code.endsWith('M')?['M','E','P']:[section.code.slice(-1)];
        const progress=deliverableProgress(state,stageCode,categories);
        const content=<>{section.tasks.map(task=>{
            const files=documents?task.items.filter(item=>item.versions.length):task.items;
            const ordered=documents?[...files].sort((a,b)=>sort==='name'?(a.versions.at(-1)?.title||a.title).localeCompare(b.versions.at(-1)?.title||b.title):sort==='latest'?(b.versions.at(-1)?.publishedAt||'').localeCompare(a.versions.at(-1)?.publishedAt||''):a.code.localeCompare(b.code)):files;
            return <View key={task.code}>
                {documents?folder(task.code,task.name,files.length,2):<TouchableOpacity accessibilityRole="button" accessibilityLabel={`Toggle ${task.code}`} accessibilityState={{expanded:isOpen(task.code)}} onPress={()=>onToggle(task.code)} style={{flexDirection:'row',alignItems:'center',gap:10,marginHorizontal:12,paddingVertical:12,borderTopWidth:1,borderColor:border}}><Ionicons name={isOpen(task.code)?'chevron-down':'chevron-forward'} size={14} color={secondary}/><Text style={{color:'#007AFF',fontSize:12,fontWeight:'700',width:85}}>{task.code}</Text><Text style={{color,flex:1,fontSize:12,fontWeight:'600'}}>{task.name}</Text><DeliverableProgressBar percent={deliverableProgress(state,stageCode,[task.category],task.group).percent} isDark={isDark} width={64}/></TouchableOpacity>}
                {isOpen(task.code)&&<View style={documents?{paddingLeft:72}:undefined}>{!documents&&<View style={{flexDirection:'row',gap:10,marginHorizontal:12,paddingVertical:7,borderTopWidth:1,borderColor:border}}><Text style={{width:110,color:secondary,fontSize:10}}>Code</Text><Text style={{flex:1,color:secondary,fontSize:10}}>Work</Text><Text style={{width:125,color:secondary,fontSize:10}}>Status</Text><Text style={{width:90,color:secondary,fontSize:10}}>PIC</Text><View style={{width:28}}/></View>}{ordered.map(item=><React.Fragment key={item.id}>{renderItem(item)}</React.Fragment>)}{documents&&!files.length&&<Text style={{color:secondary,fontSize:12,padding:12}}>No published documents yet.</Text>}{!documents&&onAdd&&<TouchableOpacity onPress={()=>onAdd(task.category,task.group)} style={{padding:12}}><Text style={{color:'#007AFF',fontSize:12}}>＋ Add Deliverable</Text></TouchableOpacity>}</View>}
            </View>;
        })}</>;
        return <View key={section.code} style={documents?undefined:{backgroundColor:surface,borderRadius:18,overflow:'hidden'}}>
            {documents?folder(section.code,section.name,published,1):<TouchableOpacity accessibilityRole="button" accessibilityLabel={`Toggle ${section.code}`} accessibilityState={{expanded:isOpen(section.code)}} onPress={()=>onToggle(section.code)} style={{flexDirection:'row',alignItems:'center',gap:10,padding:12}}><Text style={{color:'#007AFF',backgroundColor:isDark?'#122745':'#E5EFFF',borderRadius:999,paddingHorizontal:9,paddingVertical:5,fontSize:11,fontWeight:'700'}}>{section.code}</Text><Text style={{color,flex:1,fontWeight:'700',fontSize:14}}>{section.name}</Text><Text style={{color:secondary,fontSize:11}}>{progress.count} items</Text><DeliverableProgressBar percent={progress.percent} isDark={isDark}/><Ionicons name={isOpen(section.code)?'chevron-up':'chevron-down'} size={15} color={secondary}/></TouchableOpacity>}
            {isOpen(section.code)&&content}
        </View>;
    });
    if(!documents)return <View style={{gap:12}}>{renderSections(stage)}</View>;
    return <View>{REGISTER_STAGES.filter(item=>!stage||item.code===stage).map(item=>{
        const sections=registerTreeSections(state,item.code,search,true);if(search.trim()&&!sections.length&&!`${item.code} ${item.name}`.toLowerCase().includes(search.toLowerCase()))return null;
        const count=state.items.filter(row=>row.stage===item.code&&row.versions.length).length;
        return <View key={item.code}>{folder(item.code,item.name,count,0)}{isOpen(item.code)&&renderSections(item.code)}</View>;
    })}</View>;
}
