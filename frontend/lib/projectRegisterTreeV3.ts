import { RegisterV3, REGISTER_CATEGORIES, REGISTER_STAGES, registerGroups } from './projectRegisterV3';
import { planningRows } from './projectRegisterPlanningV3';
export function registerTreeSections(state:RegisterV3,stage:string,query='',documents=false) {
    const requested=query.trim().toLowerCase();
    const stageName=REGISTER_STAGES.find(item=>item.code===stage)?.name||'';
    const text=requested&&`${stage} ${stageName}`.toLowerCase().includes(requested)?'':requested;
    return REGISTER_CATEGORIES.flatMap(category=>{
        const packages=category.code==='M'?['M','E','P']:[category.code];
        const tasks=packages.flatMap(code=>{
            const rows=documents?state.items.filter(item=>item.stage===stage&&item.category===code).sort((a,b)=>(a.position??0)-(b.position??0)):planningRows(state,stage,code);
            return registerGroups(code,state,stage).flatMap(task=>{
                const all=rows.filter(item=>item.group===task.code);
                if(!all.length)return [];
                const label=`${stage}${code}-${task.code}`;
                const parentMatch=`${stage}${category.code} ${category.name} ${label} ${task.name}`.toLowerCase().includes(text);
                const matching=all.filter(item=>parentMatch||`${item.code} ${item.title} ${item.titleId||''} ${item.pic}`.toLowerCase().includes(text));
                if(text&&!matching.length)return [];
                const ids=new Set(matching.map(item=>item.id));
                for(const item of matching){let current=item;const seen=new Set<string>();while(current.parentId&&!seen.has(current.id)){seen.add(current.id);const parent=all.find(row=>row.id===current.parentId);if(!parent)break;ids.add(parent.id);current=parent;}}
                return [{code:label,name:task.name,category:code,group:task.code,items:all.filter(item=>ids.has(item.id))}];
            });
        });
        return tasks.length?[{code:`${stage}${category.code}`,name:category.code==='M'?'MEP':category.name,tasks}]:[];
    });
}
