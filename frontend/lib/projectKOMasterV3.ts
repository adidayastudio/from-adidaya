import { reconcileStageMasters } from './projectStageMastersV3';
import master from '@/constants/projectKOMasterV3.json';
import { RegisterV3 } from './projectRegisterV3';
export const KO_MASTER_V3 = master;
export function applyKOMasterV3(state: RegisterV3, makeId: () => string, selectedCodes?: string[]): RegisterV3 {
    // Only add unoccupied proposed codes. Existing project rows and legacy records win.
    const used=new Set(state.items.flatMap(item=>[item.code,...item.versions.map(version=>version.code)]));
    const items=master.items.filter(item=>(!selectedCodes||selectedCodes.includes(item.code))&&!used.has(item.code)).map((source,index)=>({
        id:makeId(),stage:'KO',category:source.code[2],group:source.code.split('-')[1],sequence:source.code.split('-')[2],suffix:'',code:source.code,
        title:source.title,titleId:source.titleId,weight:source.weight,priority:source.priority as 'low'|'medium'|'high'|'urgent',position:index+1,
        status:'Not Started' as const,revision:'00',url:'',notes:'',pic:'',deadline:'',versions:[],legacySources:source.legacySources,sourceVersion:'Legacy 2.0',migrationStatus:'proposed' as const,
    }));
    const groups=master.groups.filter(group=>!state.groups.some(old=>old.stage===group.stage&&old.category===group.category&&old.code===group.code));
    return {...state,items:[...state.items,...items],groups:[...state.groups,...groups]};
}

export function initializeRegisterMasters(state: RegisterV3, makeId: () => string): RegisterV3 {
    return reconcileStageMasters(state, makeId);
}
