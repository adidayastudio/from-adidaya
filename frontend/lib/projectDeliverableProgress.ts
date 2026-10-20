import {RegisterItem,RegisterStatus,RegisterV3,registerItemStatus,updateRegisterItem} from './projectRegisterV3';
export const DELIVERABLE_STATUS_PROGRESS:Record<RegisterStatus,number>={'Not Started':0,Draft:25,'In Progress':50,'In Review':75,Approved:100};
function activeItems(state:RegisterV3){
    return state.items.filter(item=>{if(item.excluded)return false;let parent=item.parentId;const seen=new Set([item.id]);while(parent){if(seen.has(parent))return false;seen.add(parent);const row=state.items.find(item=>item.id===parent);if(!row)break;if(row.excluded)return false;parent=row.parentId;}return true;});
}
function measure(item:RegisterItem,items:RegisterItem[],seen=new Set<string>()):{percent:number;weight:number}{
    if(seen.has(item.id))return{percent:0,weight:0};
    const weight=Math.max(0,Number(item.weight)||0),children=items.filter(row=>row.parentId===item.id);
    if(!children.length)return{percent:registerItemStatus(item)==='Published'?100:DELIVERABLE_STATUS_PROGRESS[item.status]||0,weight};
    const scores=children.map(child=>measure(child,items,new Set([...seen,item.id]))),total=scores.reduce((sum,row)=>sum+row.weight,0);
    const percent=total?scores.reduce((sum,row)=>sum+row.percent*row.weight,0)/total:scores.reduce((sum,row)=>sum+row.percent,0)/scores.length;
    return{percent,weight:weight||total};
}
export function deliverableProgress(state:RegisterV3,stage:string,categories?:string[],group?:string){
    const items=activeItems(state).filter(item=>item.stage===stage&&(!categories||categories.includes(item.category))&&(!group||item.group===group));
    const ids=new Set(items.map(item=>item.id)),roots=items.filter(item=>!item.parentId||!ids.has(item.parentId));
    const scores=roots.map(item=>measure(item,items)),weight=scores.reduce((sum,row)=>sum+row.weight,0);
    return{percent:weight?scores.reduce((sum,row)=>sum+row.percent*row.weight,0)/weight:0,weight,count:items.length};
}
export function itemDeliverableProgress(state:RegisterV3,item:RegisterItem){return measure(item,activeItems(state)).percent;}
export function hasDeliverableChildren(state:RegisterV3,item:RegisterItem){return activeItems(state).some(row=>row.parentId===item.id);}
export function setDeliverableStatus(state:RegisterV3,id:string,status:RegisterStatus){
    const item=state.items.find(row=>row.id===id);if(!item)throw new Error('Item no longer exists.');
    if(hasDeliverableChildren(state,item))throw new Error('Parent progress is calculated from its subtasks.');
    return updateRegisterItem(state,{...item,status});
}
