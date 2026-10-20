import type {Project} from '@/lib/api/projects';
import React,{useMemo} from 'react';
import {ProjectStageDeliverableEditor} from '../deliverables/ProjectStageDeliverableEditor';
import {registerTreeSections} from '@/lib/projectRegisterTreeV3';
import {REGISTER_STAGES,RegisterItem,RegisterV3} from '@/lib/projectRegisterV3';
import type {StageInfo} from '@/lib/projectDeliverables';
export function RegisterDocumentEditor({state,item,project,isDark,readOnly,onChange}:{state:RegisterV3;item:RegisterItem;project:Partial<Project>;isDark:boolean;readOnly:boolean;onChange:(content:Record<string,string>)=>void}){
 const stage=useMemo(()=>{const sections=registerTreeSections(state,item.stage,'',false);const name=REGISTER_STAGES.find(stage=>stage.code===item.stage)?.name||item.stage;return {id:item.stage,code:item.stage,name,fullName:`${item.stage} · ${name}`,color:'#007AFF',sections:sections.map(section=>({code:section.code,title:section.name,weight:0})),tasks:sections.flatMap(section=>section.tasks.flatMap(task=>task.items.map(row=>({id:row.id,code:row.code,name:row.title,nameId:row.titleId,sectionCode:section.code,weight:row.weight||0}))))} as StageInfo;},[state,item.stage]);
 return <ProjectStageDeliverableEditor project={project} stageCode={item.stage} isDark={isDark} onBack={()=>{}} pageEditor={{stage,taskCode:item.code,content:item.pageContent||{},readOnly,onChange}}/>;
}
