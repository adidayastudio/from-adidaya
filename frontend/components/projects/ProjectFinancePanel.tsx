import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { Ionicons } from '@expo/vector-icons';
import { filterFinancePeriod,financeMonthLabel,shiftFinanceMonth } from '@/lib/projectFinancePeriod';
import React,{useEffect,useLayoutEffect,useMemo,useState} from 'react';
import {ActivityIndicator,ScrollView,Text,TextInput,TouchableOpacity,View} from 'react-native';
import {BouncyFinanceCard} from '@/components/finance/BouncyFinanceCard';
import {FinanceSummaryCard} from '@/components/finance/FinanceSummaryCard';
import {SwiftUITransactionDetailSheet} from '@/components/finance/SwiftUITransactionDetailSheet';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {HeaderToolbar} from '@/components/ui/HeaderToolbar';
import {useUserContext} from '@/context/UserProvider';
import {useTenantContext} from '@/context/TenantContext';
import {useFinance} from '@/context/FinanceContext';
import {fetchPurchasingRequests,fetchReimburseRequests} from '@/lib/api/finance';
import {getFinanceStatusColor} from '@/lib/financeStatusPresentation';

type Request=Record<string,any>&{id:string;date?:string;moduleType:'purchasing'|'reimbursement'};
export function ProjectFinancePanel({projectId,isDark,onHeaderTrailingChange}:{projectId:string;isDark:boolean;onHeaderTrailingChange?:(value:React.ReactNode)=>void}){
    const {user}=useUserContext(),{activeTenant}=useTenantContext(),{hasTeamAccess}=useFinance();
    const [data,setData]=useState<{projectId:string;rows:Request[]}|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[width,setWidth]=useState(0);
    const [segment,setSegment]=useState('all'),[status,setStatus]=useState('all'),[search,setSearch]=useState(''),[searchOpen,setSearchOpen]=useState(false),[selected,setSelected]=useState('');
    const [month,setMonth]=useState('');
    const color=isDark?'#FFFFFF':'#1C1C1E',muted=isDark?'#8E8E93':'#636366',surface=isDark?'#1C1C1E':'#FFFFFF';
    const rows=useMemo(()=>data?.projectId===projectId?data.rows:[],[data,projectId]);
    const orgPrefix=(activeTenant?.company_code||'ADY').replace(/[^A-Za-z0-9]/g,'').slice(0,3).toUpperCase()||'ADY';
    useEffect(()=>{let active=true;setLoading(true);setError('');if(!user?.id){setData(null);return()=>{active=false;};}Promise.all([fetchPurchasingRequests(user.id,hasTeamAccess,orgPrefix,projectId),fetchReimburseRequests(user.id,hasTeamAccess,orgPrefix,projectId)]).then(([purchases,reimbursements])=>{if(active)setData({projectId,rows:[...purchases.map(row=>({...row,moduleType:'purchasing' as const})),...reimbursements.map(row=>({...row,moduleType:'reimbursement' as const}))].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))});}).catch(reason=>{if(active)setError(reason.message||'Unable to load project finance.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[projectId,user?.id,hasTeamAccess,orgPrefix,retry]);
    const segmentRows=filterFinancePeriod(rows,month).filter(row=>segment==='all'||row.moduleType===segment);
    const currentMonth=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).format(new Date());
    const months=useMemo(()=>[...new Set([currentMonth,...rows.map(row=>String(row.date||'').slice(0,7)).filter(value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value))])].sort().reverse(),[rows,currentMonth]);
    const statuses=useMemo(()=>[...new Set(rows.map(row=>row.status))],[rows]);
    const filtered=segmentRows.filter(row=>(status==='all'||row.status===status)&&`${row.title} ${row.ref} ${row.status} ${row.submitted_by_name}`.toLowerCase().includes(search.trim().toLowerCase()));
    const selectedRequest=filtered.find(row=>`${row.moduleType}:${row.id}`===selected);
    const money=(value:number)=>`Rp ${Math.round(value||0).toLocaleString('id-ID')}`;
    const summary=[{key:'all',label:'All Requests',icon:'tray.fill',color:'#159957'},{key:'Pending',label:'Pending',icon:'clock.fill',color:'#FF9500'},{key:'Approved',label:'Approved',icon:'checkmark.circle.fill',color:'#007AFF'},{key:'Paid',label:'Paid',icon:'creditcard.fill',color:'#34C759'}];
    const toolbar=useMemo(()=><View style={{flexDirection:'row',alignItems:'center',gap:8}}>{searchOpen&&<TextInput autoFocus accessibilityLabel="Search project finance" placeholder="Search requests" placeholderTextColor={muted} value={search} onChangeText={setSearch} style={{color,backgroundColor:surface,borderRadius:999,paddingHorizontal:12,height:34,width:190}}/>}<View style={{flexDirection:'row',alignItems:'center',height:34,borderRadius:999,backgroundColor:surface,borderWidth:1,borderColor:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.06)'}}><TouchableOpacity accessibilityLabel="Previous month" disabled={!month} onPress={()=>setMonth(value=>shiftFinanceMonth(value,-1))} style={{padding:8,opacity:month?1:0}}><Ionicons name="chevron-back" size={14} color={color}/></TouchableOpacity><ContextMenu title="Period" dropdownMenuMode actions={[{title:'All Time',selected:!month},...months.map(value=>({title:financeMonthLabel(value),selected:value===month}))]} onPress={event=>setMonth(event.nativeEvent.index?months[event.nativeEvent.index-1]:'')}><View style={{height:34,minWidth:90,alignItems:'center',justifyContent:'center'}}><Text style={{color,fontSize:12,fontWeight:'600'}}>{financeMonthLabel(month)}</Text></View></ContextMenu><TouchableOpacity accessibilityLabel="Next month" disabled={!month} onPress={()=>setMonth(value=>shiftFinanceMonth(value,1))} style={{padding:8,opacity:month?1:0}}><Ionicons name="chevron-forward" size={14} color={color}/></TouchableOpacity></View><HeaderToolbar isDark={isDark} textColor={color} actions={[{id:'search',title:'Search',icon:'search-outline',onPress:()=>setSearchOpen(value=>!value)},{id:'filter',title:'Status',icon:'filter-outline',menuActions:[{title:'All statuses',selected:status==='all'},...statuses.map(value=>({title:value,selected:value===status}))],onMenuPress:event=>setStatus(event.nativeEvent.index?statuses[event.nativeEvent.index-1]:'all')},{id:'reload',title:'Refresh',icon:'reload-outline',image:'arrow.clockwise',onPress:()=>setRetry(value=>value+1)}]}/></View>,[searchOpen,muted,search,color,surface,isDark,status,statuses,month,months]);
    useLayoutEffect(()=>{onHeaderTrailingChange?.(toolbar);},[toolbar,onHeaderTrailingChange]);
    useLayoutEffect(()=>()=>onHeaderTrailingChange?.(null),[onHeaderTrailingChange]);
    const split=width>=900;
    const list=<ScrollView contentContainerStyle={{padding:20,gap:12,paddingBottom:60}}>
        <SegmentedControl segments={[{id:'all',label:'Overview'},{id:'purchasing',label:'Purchasing'},{id:'reimbursement',label:'Reimbursement'}]} activeSegment={segment} onSegmentChange={value=>{setSegment(value);setStatus('all');}} animationType="timing"/>
        {loading&&<ActivityIndicator color="#159957"/>}{!!error&&<Text accessibilityRole="alert" style={{color:'#FF3B30'}}>{error}</Text>}
        {!loading&&!error&&<><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}>{summary.map(card=>{const subset=segmentRows.filter(row=>card.key==='all'||row.status===card.key);return <FinanceSummaryCard key={card.key} icon={card.icon as any} iconColor={card.color} label={card.label} value={String(subset.length)} subValue={money(subset.reduce((sum,row)=>sum+Number(row.amount||0),0))} style={{width:150,marginBottom:0,backgroundColor:status===card.key?(isDark?`${card.color}45`:`${card.color}25`):surface}} onPress={()=>setStatus(card.key)}/>;})}</ScrollView>
            {!filtered.length&&<Text style={{color:muted,padding:20}}>No requests for this project match the current filters.</Text>}
            {filtered.map(item=>{const key=`${item.moduleType}:${item.id}`,active=selected===key,priority=String(item.priority||'').toLowerCase();const bg=active?(isDark?'rgba(0,122,255,0.15)':'rgba(0,122,255,0.08)'):priority==='urgent'?(isDark?'rgba(255,59,48,0.18)':'#FFF5F5'):priority==='high'?(isDark?'rgba(255,149,0,0.18)':'#FFF9F0'):surface;
                return <BouncyFinanceCard key={key} style={{borderRadius:24,overflow:'hidden',backgroundColor:bg,borderWidth:active?1.5:0,borderColor:active?'#007AFF':'transparent'}}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${item.title}`} accessibilityState={{selected:active}} onPress={()=>setSelected(value=>value===key?'':key)} style={{padding:16,paddingBottom:12}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><View style={{flex:1,marginRight:12}}><Text style={{color,fontSize:16,fontWeight:'700'}} numberOfLines={1}>{item.title||item.description||'Request'}</Text><View style={{flexDirection:'row',alignItems:'center',marginTop:4,gap:8}}><View style={{backgroundColor:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)',paddingHorizontal:8,paddingVertical:3,borderRadius:20}}><Text style={{color,fontSize:11,fontWeight:'600'}}>{item.project_obj?.project_code||item.project||'—'}</Text></View><Text style={{color:muted,fontSize:13}} numberOfLines={1}>{item.cardRef||item.shortRef||item.ref} · {String(item.date||'').slice(0,10)}</Text></View></View><View style={{alignItems:'flex-end'}}><Text style={{color,fontSize:16,fontWeight:'700',marginBottom:2}}>{money(Number(item.amount))}</Text><Text style={{color:getFinanceStatusColor(item.status,isDark),fontSize:12,fontWeight:'700'}}>{item.status}</Text></View></View></TouchableOpacity></BouncyFinanceCard>;
            })}</>}
    </ScrollView>;
    return <View onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={{flex:1,minHeight:0}}>
        {!onHeaderTrailingChange&&toolbar}
        {split?<View style={{flex:1,flexDirection:'row',minHeight:0}}><View style={{...DESKTOP_LIST_PANE,borderRightWidth:1,borderColor:isDark?'#242426':'#E5E5EA'}}>{list}</View><View style={{flex:1,minWidth:0}}>{selectedRequest?<SwiftUITransactionDetailSheet key={selected} isOpened onClose={()=>setSelected('')} request={selectedRequest} isEmbedded/>:<View style={{flex:1,alignItems:'center',justifyContent:'center',padding:24}}><Text style={{color:muted}}>Select a request to view its details.</Text></View>}</View></View>:list}
        {!split&&!!selectedRequest&&<SwiftUITransactionDetailSheet key={selected} isOpened onClose={()=>setSelected('')} request={selectedRequest}/>}
    </View>;
}
