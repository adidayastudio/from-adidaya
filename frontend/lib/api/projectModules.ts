import { supabase } from '@/lib/supabase';
export type ProjectModule='finance'|'resources'|'report';
export interface ProjectModuleRow {id:string;projectId:string;title:string;type:string;status:string;date:string;amount?:number;quantity?:number;unit?:string;reference?:string;content?:string;}
async function projectRows(table:string,columns:string,projectId:string,dateColumn:string){
    if(!projectId)throw new Error('Select a project first.');
    const rows:any[]=[];
    for(let offset=0;;offset+=500){
        const {data,error}=await supabase.from(table).select(columns).eq('project_id',projectId).order(dateColumn,{ascending:false}).order('id').range(offset,offset+499);
        if(error)throw new Error(error.message||'Unable to load project data.');
        rows.push(...(data||[]));if(!data||data.length<500)return rows;
    }
}
export async function getProjectModuleRows(module:ProjectModule,projectId:string):Promise<ProjectModuleRow[]>{
    if(module==='finance'){
        const [purchases,reimbursements]=await Promise.all([
            projectRows('purchasing_requests','id,project_id,date,description,amount,approval_status,financial_status,request_number',projectId,'date'),
            projectRows('reimbursement_requests','id,project_id,date,description,amount,status,request_number',projectId,'date'),
        ]);
        return [...purchases.map(row=>({id:`purchase:${row.id}`,projectId:row.project_id,title:row.description||row.request_number||'Purchasing request',type:'Purchasing',status:[row.approval_status,row.financial_status].filter(Boolean).join(' · ')||'—',date:row.date||'',amount:Number(row.amount)||0,reference:row.request_number})),...reimbursements.map(row=>({id:`reimbursement:${row.id}`,projectId:row.project_id,title:row.description||row.request_number||'Reimbursement request',type:'Reimbursement',status:row.status||'—',date:row.date||'',amount:Number(row.amount)||0,reference:row.request_number}))].sort((a,b)=>b.date.localeCompare(a.date));
    }
    if(module==='resources'){
        const rows=await projectRows('resource_inventory','id,project_id,quantity_in,quantity_used,quantity_manual_adj,updated_at,resource:pricing_resources(name,category,unit)',projectId,'updated_at');
        return rows.map(row=>{const resource=Array.isArray(row.resource)?row.resource[0]:row.resource;return{id:row.id,projectId:row.project_id,title:resource?.name||'Resource',type:resource?.category||'Other',status:'Inventory',date:row.updated_at||'',quantity:(Number(row.quantity_in)||0)-(Number(row.quantity_used)||0)+(Number(row.quantity_manual_adj)||0),unit:resource?.unit||''};});
    }
    const rows=await projectRows('project_reports','id,project_id,title,report_type,report_date,status,content',projectId,'report_date');
    return rows.map(row=>({id:row.id,projectId:row.project_id,title:row.title||'Report',type:row.report_type||'Report',status:row.status||'—',date:row.report_date||'',content:row.content}));
}
