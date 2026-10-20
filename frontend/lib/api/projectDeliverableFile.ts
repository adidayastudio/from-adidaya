import {supabase} from '@/lib/supabase';
export async function uploadDeliverableFile(tenantId:string,projectId:string,itemId:string,name:string,contentType:string,body:Blob|ArrayBuffer){
    if(!tenantId||!projectId||!itemId)throw new Error('Project context is missing.');
    const safeName=name.replace(/[^a-zA-Z0-9._-]/g,'_')||'file';
    const path=`${tenantId}/projects/${projectId}/deliverables/${itemId}/${globalThis.crypto.randomUUID()}/${safeName}`;
    const bucket=supabase.storage.from('project-files');
    const {error}=await bucket.upload(path,body,{contentType:contentType||'application/octet-stream',upsert:false});
    if(error)throw error;
    return bucket.getPublicUrl(path).data.publicUrl;
}
