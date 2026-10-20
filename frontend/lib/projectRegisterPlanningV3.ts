import { addRegisterItem, RegisterItem, RegisterV3 } from './projectRegisterV3';
export const REGISTER_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export function planningRows(state: RegisterV3, stage: string, category: string): RegisterItem[] {
    const rows = state.items.filter(item => item.stage === stage && item.category === category && !item.excluded).sort((a,b)=>(a.position??Number(a.sequence))-(b.position??Number(b.sequence)));
    const walk=(parent?:string,seen=new Set<string>()):RegisterItem[]=>rows.filter(item=>(item.parentId||undefined)===parent).flatMap(item=>seen.has(item.id)?[]:[item,...walk(item.id,new Set([...seen,item.id]))]);
    return walk();
}
export function editPlanningItem(state:RegisterV3,id:string,patch:Partial<RegisterItem>):RegisterV3 {
    const item=state.items.find(row=>row.id===id);
    if(!item)throw new Error('Work item no longer exists.');
    if(patch.weight!==undefined&&(!Number.isFinite(patch.weight)||patch.weight<0))throw new Error('Weight must be zero or more.');
    return {...state,items:state.items.map(row=>row.id===id?{...row,...patch,id:row.id,code:row.code,versions:row.versions}:row)};
}
export function addPlanningWork(state:RegisterV3,stage:string,category:string,group:string,id:string,relativeId?:string,placement='below',renumber=true):RegisterV3 {
    const relative=state.items.find(item=>item.id===relativeId);
    const parent=placement==='subtask'?relative:state.items.find(item=>item.id===relative?.parentId);
    let next:RegisterV3;
    if(parent){
        const reserved=new Set(state.items.flatMap(item=>[item.code,...(item.codeAliases||[]),...item.versions.map(version=>version.code)]));
        let number=1;while(number<=99&&reserved.has(`${parent.code}-${String(number).padStart(2,'0')}`))number++;
        if(number>99)throw new Error('This task already uses all 99 subtask numbers.');
        const sequence=`${parent.sequence}-${String(number).padStart(2,'0')}`;
        next={...state,items:[...state.items,{...parent,id,title:'New Work',titleId:'',sequence,code:`${parent.code}-${String(number).padStart(2,'0')}`,suffix:'',parentId:parent.id,masterSourceKey:undefined,legacySources:undefined,codeAliases:undefined,versions:[],status:'Not Started',revision:'00',url:'',notes:'',pic:'',deadline:'',relatedModule:undefined,excluded:false}]};
    }else next=addRegisterItem(state,stage,category,group,'New Work',id);
    const siblings=state.items.filter(item=>item.stage===stage&&item.category===category&&!item.excluded).sort((a,b)=>(a.position??Number(a.sequence))-(b.position??Number(b.sequence)));
    let at=relative?siblings.findIndex(item=>item.id===relative.id)+(placement==='above'?0:1):siblings.length;
    if(at<0)at=siblings.length;
    const added=next.items.find(item=>item.id===id)!;
    siblings.splice(at,0,{...added,parentId:placement==='subtask'?relative?.id:relative?.parentId,weight:0,priority:'medium',titleId:''});
    const updates=new Map(siblings.map((item,index)=>[item.id,{...item,position:index+1}]));
    next={...next,items:next.items.map(item=>updates.get(item.id)||item)};
    return renumber?renumberPlanningWork(next,stage,category):next;
}
export function planningWorkAction(state:RegisterV3,id:string,action:'up'|'down'|'exclude'):RegisterV3 {
    const item=state.items.find(row=>row.id===id);if(!item)return state;
    if(action==='exclude'){
        const ids=new Set([id]);let changed=true;
        while(changed){changed=false;state.items.forEach(row=>{if(row.parentId&&ids.has(row.parentId)&&!ids.has(row.id)){ids.add(row.id);changed=true;}});}
        return {...state,items:state.items.map(row=>ids.has(row.id)?{...row,excluded:true}:row)};
    }
    const rows=planningRows(state,item.stage,item.category).filter(row=>row.parentId===item.parentId&&row.group===item.group);
    const index=rows.findIndex(row=>row.id===id),neighbor=rows[index+(action==='up'?-1:1)];if(!neighbor)return state;
    const ranks=new Map(planningRows(state,item.stage,item.category).map((row,index)=>[row.id,index+1]));
    return renumberPlanningWork({...state,items:state.items.map(row=>row.id===id?{...row,position:ranks.get(neighbor.id)}:row.id===neighbor.id?{...row,position:ranks.get(item.id)}:ranks.has(row.id)?{...row,position:ranks.get(row.id)}:row)},item.stage,item.category);
}

// Repair draft children created by the former flat numbering implementation.
export function repairPlanningHierarchy(state:RegisterV3):RegisterV3 {
    let next=state;
    const visited=new Set<string>();
    const repair=(id:string):void=>{
        if(visited.has(id))return;visited.add(id);
        let item=next.items.find(row=>row.id===id);if(!item?.parentId)return;
        repair(item.parentId);item=next.items.find(row=>row.id===id)!;
        const parent=next.items.find(row=>row.id===item!.parentId);
        if(!parent||item.versions.length||item.masterSourceKey||item.legacySources?.length)return;
        if(item.code.startsWith(`${parent.code}-`))return;
        const created=addPlanningWork(next,parent.stage,parent.category,parent.group,'__repair__',parent.id,'subtask',false).items.find(row=>row.id==='__repair__')!;
        next={...next,items:next.items.map(row=>row.id===id?{...row,group:parent.group,sequence:created.sequence,code:created.code,codeAliases:[...new Set([...(row.codeAliases||[]),row.code])]}:row)};
    };
    state.items.forEach(item=>repair(item.id));return next;
}
export function validHierarchyRecode(old:RegisterItem,next:RegisterItem,state:RegisterV3):boolean {
    if(!old.parentId||old.versions.length||old.masterSourceKey||old.legacySources?.length)return false;
    const repaired=repairPlanningHierarchy(state).items.find(item=>item.id===old.id);
    return repaired?.code===next.code && next.codeAliases?.includes(old.code)===true;
}

// Current codes follow sibling order; IDs and published snapshots retain identity.
export function renumberPlanningWork(state:RegisterV3,stage:string,category:string):RegisterV3 {
    const rows=state.items.filter(row=>row.stage===stage&&row.category===category);
    const updates=new Map<string,RegisterItem>();
    const visit=(parent:RegisterItem|undefined,group:string,seen=new Set<string>()):void=>{
        const siblings=rows.filter(row=>row.group===group&&(row.parentId||undefined)===parent?.id).sort((a,b)=>Number(!!a.excluded)-Number(!!b.excluded)||(a.position??Number(a.sequence.split('-').at(-1)))-(b.position??Number(b.sequence.split('-').at(-1))));
        if(siblings.length>99)throw new Error('A task supports at most 99 direct subtasks.');
        siblings.forEach((row,index)=>{
            if(seen.has(row.id))throw new Error('Task hierarchy contains a cycle.');
            const sequence=`${parent?parent.sequence+'-':''}${String(index+1).padStart(2,'0')}`;
            const code=`${stage}${category}-${group}-${sequence}${row.suffix}`;
            const updated=code===row.code?row:{...row,sequence,code,codeAliases:[...new Set([...(row.codeAliases||[]),row.code])]};
            updates.set(row.id,updated);visit(updated,group,new Set([...seen,row.id]));
        });
    };
    [...new Set(rows.map(row=>row.group))].forEach(group=>visit(undefined,group));
    if(!rows.some(row=>updates.get(row.id)&&updates.get(row.id)!==row))return state;
    return {...state,items:state.items.map(row=>updates.get(row.id)||row)};
}
export function validOrderedRecode(old:RegisterItem,item:RegisterItem,next:RegisterV3):boolean {
    const expected=renumberPlanningWork(next,item.stage,item.category).items.find(row=>row.id===item.id);
    return item.stage===old.stage&&item.category===old.category&&item.group===old.group&&item.parentId===old.parentId&&expected?.code===item.code&&item.codeAliases?.includes(old.code)===true;
}
