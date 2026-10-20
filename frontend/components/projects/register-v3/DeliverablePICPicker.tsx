import React from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Text,View} from 'react-native';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import type {RegisterItem} from '@/lib/projectRegisterV3';
import {DeliverablePerson,selectedPIC,picInitials,togglePIC} from '@/lib/projectDeliverablePIC';
export function DeliverablePICPicker({item,people,onChange,disabled,color,isDark,field=false}:{item:RegisterItem;people:DeliverablePerson[];onChange:(patch:Partial<RegisterItem>)=>void;disabled:boolean;color:string;isDark:boolean;field?:boolean}){
 const selected=selectedPIC(item),options=people;
 return <ContextMenu title="PIC · Select people" dropdownMenuMode disabled={disabled} actions={options.length?[...options.map(person=>({title:person.name,selected:selected.some(value=>value.id===person.id||value.name===person.name)})),...(selected.length?[{title:'Clear PIC',selected:false}]:[])]:[{title:'No people available',disabled:true}]} onPress={event=>{const person=options[event.nativeEvent.index];if(person)onChange(togglePIC(item,person));else if(selected.length)onChange({pic:'',assignees:[]});}}><View accessibilityLabel={`PIC: ${selected.map(person=>person.name).join(', ')||'Unassigned'}`} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:4,minHeight:field?40:undefined,paddingVertical:field?10:7,paddingHorizontal:field?14:8,borderRadius:999,backgroundColor:isDark?(field?'#1C1C1E':'#2C2C2E'):(field?'#FFFFFF':'#F2F2F7')}}><Text numberOfLines={1} style={{color,fontSize:field?14:11,flex:1}}>{selected.map(person=>picInitials(person.name)).join(' · ')||'—'}</Text><Ionicons name="chevron-down" size={11} color={color}/></View></ContextMenu>;
}
