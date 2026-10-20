type QueryValue=string|string[]|undefined;
export type WorkspaceQuery={project?:QueryValue;section?:QueryValue;focus?:QueryValue;register?:QueryValue};
const single=(value:QueryValue)=>Array.isArray(value)?value[0]:value;
const sections=new Set(['overview','work','docs','activity','tracking','module:finance','module:resources','module:report',...['stages','wbs','volume','rab','schedule','reports'].map(value=>`planning:${value}`),...['general','team','stages','wbs','control','cost','time','prices','reports','management'].map(value=>`settings:${value}`)]);
export function readProjectWorkspaceLocation(params:WorkspaceQuery){
    const section=single(params.section)||'overview';
    return {projectId:single(params.project)||'',section:sections.has(section)?section:'overview',focus:single(params.focus)==='1',registerVersion:single(params.register)==='2'?2 as const:3 as const};
}
export function projectWorkspaceParams(projectId?:string){
    return {project:projectId||undefined,section:undefined,focus:undefined,register:undefined};
}
