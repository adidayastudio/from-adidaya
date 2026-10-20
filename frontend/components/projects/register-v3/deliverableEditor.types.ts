import type React from 'react';
import type {RegisterItem} from '@/lib/projectRegisterV3';
export interface DeliverableEditorSheetProps {
    visible:boolean;onClose:()=>void;isDark:boolean;children:React.ReactNode;
    nativeEditor?:{onUpload:()=>void;people:import('@/lib/projectDeliverablePIC').DeliverablePerson[];item:RegisterItem|null;saving:boolean;locked:boolean;parentProgress?:number;onChange:(patch:Partial<RegisterItem>)=>void;onSave:()=>void;onRevise:()=>void;onPublish:()=>void;};
}
