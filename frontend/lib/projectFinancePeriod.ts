export function shiftFinanceMonth(month:string,delta:number){
    const [year,value]=month.split('-').map(Number);
    const date=new Date(year,value-1+delta,1);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
export function financeMonthLabel(month:string){
    if(!month)return 'All Time';
    const [year,value]=month.split('-').map(Number);
    return new Date(year,value-1,1).toLocaleDateString('en-US',{month:'short',year:'numeric'});
}
export function filterFinancePeriod<T extends {date?:string}>(rows:T[],month:string):T[]{return month?rows.filter(row=>String(row.date||'').slice(0,7)===month):rows;}
