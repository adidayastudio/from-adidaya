import React,{useEffect,useLayoutEffect,useMemo,useState} from 'react';
import {ActivityIndicator,ScrollView,Text,TextInput,TouchableOpacity,View} from 'react-native';
import {HeaderToolbar} from '@/components/ui/HeaderToolbar';
import {getProjectModuleRows,ProjectModule,ProjectModuleRow} from '@/lib/api/projectModules';
import {reportContentFields} from '@/lib/api/projectReports';
import {PROJECT_LINKED_MODULES} from '@/lib/projectLinkedModules';

export function ProjectModulePanel({projectId,module,isDark,onHeaderTrailingChange}:{projectId:string;module:ProjectModule;isDark:boolean;onHeaderTrailingChange?:(content:React.ReactNode)=>void}){
    const [result,setResult]=useState<{projectId:string;module:ProjectModule;rows:ProjectModuleRow[]}|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
    const [search,setSearch]=useState(''),[searchOpen,setSearchOpen]=useState(false),[type,setType]=useState('all'),[selected,setSelected]=useState('');
    const color=isDark?'#FFFFFF':'#1C1C1E',secondary=isDark?'#8E8E93':'#636366',surface=isDark?'#1C1C1E':'#FFFFFF',border=isDark?'#303034':'#E5E5EA';
    const accent=PROJECT_LINKED_MODULES.find(item=>item.id===module)?.color||'#0036F8';
    const rows=useMemo(()=>result?.projectId===projectId&&result.module===module?result.rows:[],[result,projectId,module]);
    useEffect(()=>{let active=true;setLoading(true);setError('');setSearch('');setType('all');setSelected('');getProjectModuleRows(module,projectId).then(rows=>{if(active)setResult({projectId,module,rows});}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Unable to load project data.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[projectId,module,retry]);
    const types=useMemo(()=>[...new Set(rows.map(row=>row.type))],[rows]);
    const filtered=rows.filter(row=>(type==='all'||row.type===type)&&(!search.trim()||`${row.title} ${row.type} ${row.status} ${row.reference||''}`.toLowerCase().includes(search.trim().toLowerCase())));
    const toolbar=useMemo(()=><View style={{flexDirection:'row',gap:8,alignItems:'center'}}>{searchOpen&&<TextInput autoFocus accessibilityLabel="Search project module" placeholder="Search" placeholderTextColor={secondary} value={search} onChangeText={setSearch} style={{color,backgroundColor:surface,borderRadius:999,paddingHorizontal:12,height:34,width:190}}/>}<HeaderToolbar isDark={isDark} textColor={color} actions={[{id:'search',title:'Search',icon:'search-outline',onPress:()=>setSearchOpen(value=>!value)},{id:'filter',title:'Filter type',icon:'filter-outline',tintColor:type==='all'?color:accent,menuActions:[{title:'All types',selected:type==='all'},...types.map(value=>({title:value,selected:type===value}))],onMenuPress:event=>setType(event.nativeEvent.index?types[event.nativeEvent.index-1]:'all')},{id:'refresh',title:'Refresh',icon:'refresh-outline',image:'arrow.clockwise',onPress:()=>setRetry(value=>value+1)}]}/></View>,[searchOpen,search,secondary,color,surface,isDark,type,accent,types]);
    useLayoutEffect(()=>{onHeaderTrailingChange?.(toolbar);},[toolbar,onHeaderTrailingChange]);
    useLayoutEffect(()=>()=>onHeaderTrailingChange?.(null),[onHeaderTrailingChange]);
    const money=(value:number)=>`Rp ${Math.round(value).toLocaleString('id-ID')}`;
    const summaries=module==='finance'?[['Requested amount',money(rows.reduce((sum,row)=>sum+(row.amount||0),0))],['Purchasing',String(rows.filter(row=>row.type==='Purchasing').length)],['Reimbursements',String(rows.filter(row=>row.type==='Reimbursement').length)]]:module==='resources'?[['Inventory items',String(rows.length)],['Resource types',String(types.length)]]:[['Reports',String(rows.length)],['Report types',String(types.length)]];
    const ready=!loading&&!error&&result?.projectId===projectId&&result.module===module;
    return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,gap:12,paddingBottom:60,maxWidth:960,width:'100%',alignSelf:'center'}}>
        {!onHeaderTrailingChange&&toolbar}
        {loading&&<ActivityIndicator color={accent}/>}
        {!!error&&<View style={{gap:10}}><Text accessibilityRole="alert" style={{color:'#FF3B30'}}>{error}</Text><TouchableOpacity onPress={()=>setRetry(value=>value+1)}><Text style={{color:accent}}>Retry</Text></TouchableOpacity></View>}
        {ready&&<><View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{summaries.map(([label,value])=><View key={label} style={{backgroundColor:surface,borderRadius:18,padding:16,flex:1,minWidth:150,gap:8}}><Text style={{color:secondary,fontSize:12}}>{label}</Text><Text style={{color:accent,fontSize:20,fontWeight:'700'}}>{value}</Text></View>)}</View>
            <View style={{backgroundColor:surface,borderRadius:18,overflow:'hidden'}}>
                {!filtered.length&&<Text style={{color:secondary,padding:20}}>{rows.length?'No matching records.':`No ${module==='report'?'reports':module==='finance'?'finance records':'inventory'} for this project yet.`}</Text>}
                {filtered.map(row=><View key={row.id} style={{borderBottomWidth:1,borderColor:border}}><TouchableOpacity accessibilityRole="button" accessibilityState={{expanded:selected===row.id}} onPress={()=>setSelected(value=>value===row.id?'':row.id)} style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12,padding:12}}><View style={{flex:1,minWidth:170,gap:4}}><Text style={{color,fontSize:13,fontWeight:'600'}}>{row.title}</Text><Text style={{color:secondary,fontSize:11,textTransform:'capitalize'}}>{row.type}{row.reference?` · ${row.reference}`:''}</Text></View><Text style={{color:secondary,fontSize:12,textTransform:'capitalize'}}>{row.status.replace(/_/g,' ')}</Text><Text style={{color:secondary,fontSize:12}}>{row.date.slice(0,10)}</Text>{row.amount!==undefined&&<Text style={{color,fontSize:12,fontWeight:'600'}}>{money(row.amount)}</Text>}{row.quantity!==undefined&&<Text style={{color,fontSize:12,fontWeight:'600'}}>{row.quantity.toLocaleString('en-US')} {row.unit}</Text>}</TouchableOpacity>
                    {selected===row.id&&<View style={{padding:12,gap:8}}><Text selectable style={{color:secondary,fontSize:12}}>{row.title}</Text>{row.quantity!==undefined&&<Text style={{color,fontSize:12}}>Available: {row.quantity} {row.unit}</Text>}{row.content&&reportContentFields(row.content).map(([key,value])=><View key={key} style={{gap:4}}><Text style={{color:secondary,fontSize:12}}>{key.replace(/_/g,' ')}</Text><Text selectable style={{color,fontSize:12,lineHeight:20}}>{typeof value==='object'?JSON.stringify(value,null,2):String(value??'—')}</Text></View>)}</View>}
                </View>)}
            </View></>}
    </ScrollView>;
}
