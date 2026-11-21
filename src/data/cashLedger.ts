import {useMemo} from 'react';
import {useLocalData,updateLocal} from './localStore';
import type {LocalData} from './localStore';
export type CashPosting = {
  id:string; code?:string; sequence?:number; customerId?:string; date:string; party:string; partyType:string; currency:string;
  amount:number; type:'قبض'|'صرف'; reason:string; reference:string; description:string; notes:string;
};

const round=(v:number)=>Number(v.toFixed(6));
export function buildCashLedger(data:LocalData){
 const balances:Record<string,number>={USD:0,IQD:0};
 for(const r of data.rates){balances[r.base]??=0;balances[r.counter]??=0;}
 const legs=[...data.cash.map(p=>({...p,signed:p.type==='قبض'?p.amount:-p.amount})),...data.exchange.filter(r=>r.status==='مكتملة').flatMap(r=>{const sell=r.type==='بيع';const common={date:r.date,party:r.party,partyType:'أخرى',type:r.type+' عملة',reason:'',reference:r.id,description:r.description,notes:r.notes};return [{...common,id:r.id+'-base',currency:r.currency,amount:r.amount,signed:sell?-r.amount:r.amount},{...common,id:r.id+'-counter',currency:r.counter,amount:r.counterpart+(sell?r.commission:-r.commission),signed:sell?r.counterpart+r.commission:-(r.counterpart-r.commission)}];})].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const cashboxMovements=legs.map(p=>{balances[p.currency]=round((balances[p.currency]??0)+p.signed);return {...p,incoming:p.signed>=0,balance:balances[p.currency],reference:p.reference||p.id,description:p.description||p.reason||p.type,user:'المستخدم المحلي'};});
 const registerMovements=cashboxMovements.map(m=>({...m,box:'main',incoming:m.incoming?m.amount:0,outgoing:m.incoming?0:m.amount,status:'مكتملة'}));
 const registerBalanceRows=Object.entries(balances).map(([currency,current])=>{const moves=registerMovements.filter(m=>m.currency===currency);return {id:'main-'+currency,box:'main',name:'الصندوق الرئيسي',branch:'الصندوق الرئيسي',currency,opening:0,incoming:round(moves.reduce((s,m)=>s+m.incoming,0)),outgoing:round(moves.reduce((s,m)=>s+m.outgoing,0)),current,last:moves.at(-1)?.date||'—',updated:moves.at(-1)?.date||'—'};});
 return {cashboxBalances:balances,cashboxMovements,registerMovements,registerBalanceRows};
}
export function useCashLedger(){const data=useLocalData();return useMemo(()=>buildCashLedger(data),[data]);}
export function postCashVoucher(posting:CashPosting) {
 if (!posting.id || !posting.party.trim() || !posting.currency || !Number.isFinite(posting.amount)
   || posting.amount <= 0 || posting.amount > 1e12 || !Number.isFinite(Date.parse(posting.date))) {
   throw Error('بيانات السند غير صالحة للحفظ.');
 }
 const saved = updateLocal(data => {
   const customer = data.customers.find(row => row.id === posting.customerId);
   if (!customer || posting.partyType !== 'عميل') throw Error('اختر عميلًا محفوظًا.');
   const next = {...posting,party:customer.name};
   const cash = data.cash.some(row => row.id === posting.id)
     ? data.cash.map(row => row.id === posting.id ? {...next,date:row.date} : row)
     : [...data.cash,next];
   return {...data,cash};
 });
 if (!saved) throw Error('لم يتم حفظ السند. راجع التنبيه وأعد المحاولة.');
}
