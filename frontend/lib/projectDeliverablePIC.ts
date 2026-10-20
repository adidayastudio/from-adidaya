import type {RegisterItem} from './projectRegisterV3';
export type DeliverablePerson={id:string;name:string};
export function selectedPIC(item:Pick<RegisterItem,'pic'|'assignees'>):DeliverablePerson[]{return item.assignees??(item.pic?[{id:`legacy:${item.pic}`,name:item.pic}]:[]);}
export function picInitials(name:string){const parts=name.trim().split(/\s+/);return (parts.length>1?parts[0][0]+parts.at(-1)![0]:parts[0].slice(0,2)).toUpperCase();}
export function togglePIC(item:Pick<RegisterItem,'pic'|'assignees'>,person:DeliverablePerson){const selected=selectedPIC(item);const assignees=selected.some(value=>value.id===person.id||value.name===person.name)?selected.filter(value=>value.id!==person.id&&value.name!==person.name):[...selected,person];return {assignees,pic:assignees.map(value=>value.name).join(', ')};}
