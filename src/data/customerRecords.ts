import {useMemo} from 'react';
import {useLocalData,updateLocal,localDate} from './localStore';
import type {LocalData} from './localStore';
export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  active: boolean;
  created: string;
  updated: string;
  lastActivity: string;
  balances: Record<string, number>;
};

const round=(value:number)=>Number(value.toFixed(6));
export function customerCashDelta(data:LocalData,id:string){
 const balances:Record<string,number>={};
 for(const posting of data.cash){if(posting.customerId===id && posting.partyType==='عميل')balances[posting.currency]=round((balances[posting.currency]||0)+(posting.type==='قبض'?posting.amount:-posting.amount));}
 return balances;
}
export function currentCustomers(data:LocalData):Customer[]{
 return data.customers.map(customer=>{
  const balances={...customer.balances};
  for(const [currency,value] of Object.entries(customerCashDelta(data,customer.id)))balances[currency]=round((balances[currency]||0)+value);
  const last=data.cash.filter(p=>p.customerId===customer.id&&p.partyType==='عميل').map(p=>p.date).sort().at(-1);
  return {...customer,balances,lastActivity:last||customer.lastActivity,updated:last&&last>customer.updated?last:customer.updated};
 });
}
export function useCustomers(){const data=useLocalData();return useMemo(()=>currentCustomers(data),[data]);}
export function saveCustomer(id:string|null,details:Pick<Customer,'name'|'phone'|'address'|'notes'> & Partial<Pick<Customer,'balances'|'active'>>){
 if(!details.name.trim()||Object.values(details.balances||{}).some(v=>!Number.isFinite(v)||Math.abs(v)>1e12))return false;
 const date=localDate();return updateLocal(data=>{
  if(id){
   if(!data.customers.some(c=>c.id===id))throw Error('العميل غير موجود');
   const delta=customerCashDelta(data,id);
   return {...data,customers:data.customers.map(c=>c.id===id?{...c,...details,balances:details.balances?{...c.balances,...Object.fromEntries(Object.entries(details.balances).map(([currency,current])=>[currency,round(current-(delta[currency]||0))]))}:c.balances,updated:date}:c)};
  }
  return {...data,customers:[{id:`C-${crypto.randomUUID()}`,name:details.name.trim(),phone:details.phone,address:details.address,notes:details.notes,active:details.active??true,created:date,updated:date,lastActivity:'—',balances:details.balances??{USD:0,IQD:0}},...data.customers]};
 });
}
export function toggleCustomer(id:string){return updateLocal(data=>({...data,customers:data.customers.map(c=>c.id===id?{...c,active:!c.active,updated:localDate()}:c)}));}
