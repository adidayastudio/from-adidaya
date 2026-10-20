import React,{useState} from 'react';
import {View,Text,Platform,Linking,TouchableOpacity} from 'react-native';
import {FinanceAttachmentPreview} from '@/components/finance/FinanceAttachmentPreview';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {RegisterDocumentEditor} from './RegisterDocumentEditor';
import type {RegisterItem,RegisterV3} from '@/lib/projectRegisterV3';
import type {Project} from '@/lib/api/projects';
export function DeliverablePreview({state,item,project,isDark,showPage=false}:{state:RegisterV3;item:RegisterItem;project:Partial<Project>;isDark:boolean;showPage?:boolean}){
 const hasPage=showPage||Object.values(item.pageContent||{}).some(value=>value.trim());
 const hasFile=/^https?:\/\//i.test(item.url);
 const [tab,setTab]=useState('page');
 if(!hasPage&&!hasFile)return null;
 const page=hasPage&&(!hasFile||tab==='page');
 return <View style={{gap:12}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}><Text style={{color:isDark?'#9898A2':'#636366',fontSize:12}}>Preview</Text>{hasPage&&hasFile&&<SegmentedControl compact animationType="timing" segments={[{id:'page',label:'Page'},{id:'file',label:'File'}]} activeSegment={tab} onSegmentChange={setTab}/>}</View>{page?<RegisterDocumentEditor state={state} item={item} project={project} isDark={isDark} readOnly onChange={()=>{}}/>:Platform.OS==='web'?<View style={{height:360,borderRadius:16,overflow:'hidden',backgroundColor:'#1C1C1E'}}><FinanceAttachmentPreview url={item.url}/></View>:<TouchableOpacity onPress={()=>void Linking.openURL(item.url)}><Text style={{color:'#007AFF'}}>Open file preview</Text></TouchableOpacity>}</View>;
}
