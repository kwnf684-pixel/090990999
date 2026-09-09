import {useSyncExternalStore} from 'react';
import type {Customer} from './customerRecords';
import type {TransferRecord} from './transferRecords';
import type {LocalRate} from './currencyStore';
import type {CashPosting} from './cashLedger';
export type ExchangeEntry={id:string;date:string;type:string;party:string;currency:string;amount:number;rate:number;counter:string;counterpart:number;commission:number;box:string;user:string;status:string;description:string;notes:string};
export type LocalData={schema:1;wallets?:{id:string;name:string;balance:number}[];customers:Customer[];transfers:TransferRecord[];rates:LocalRate[];rateLog?:LocalRate[];cash:CashPosting[];exchange:ExchangeEntry[]};
const empty=():LocalData=>({schema:1,customers:[],transfers:[],rates:[],cash:[],exchange:[]});
function valid(d:LocalData){
 const strings=(r:object,keys:string[])=>keys.every(k=>typeof (r as Record<string,unknown>)[k]==='string');
 const numbers=(r:object,keys:string[])=>keys.every(k=>Number.isFinite((r as Record<string,unknown>)[k]));
 const unique=(rows:{id:string}[])=>new Set(rows.map(r=>r.id)).size===rows.length;
 return [d.customers,d.cash,d.exchange,d.transfers,d.rates].every(rows=>rows.every(r=>r&&typeof r==='object')&&unique(rows))
 &&d.customers.every(r=>strings(r,['id','name','phone','address','notes','created','updated','lastActivity'])&&r.balances&&Object.values(r.balances).every(Number.isFinite))
 &&d.cash.every(r=>strings(r,['id','date','party','currency','type','partyType','reason','reference','description','notes'])&&numbers(r,['amount']))
 &&d.transfers.every(r=>strings(r,['id','date','sender','recipient','currency','status','direction','office','senderPhone','recipientPhone','senderAddress','recipientAddress','notes','reason','voucher','deliveredAt'])&&numbers(r,['amount','commission']))
 &&d.exchange.every(r=>strings(r,['id','date','party','currency','counter','type','status','box','user','description','notes'])&&numbers(r,['amount','rate','commission','counterpart']))
 &&d.rates.every(r=>strings(r,['id','base','counter','name','user','updated','notes'])&&numbers(r,['buy','sell']))
 &&(!d.wallets||Array.isArray(d.wallets)&&d.wallets.every(r=>r&&strings(r,['id','name'])&&numbers(r,['balance'])));
}
export type SyncChange={collection:string;id:string;value:unknown|null;version:number};
export type PendingChange={collection:string;id:string;value:unknown|null;baseVersion:number};
export type PendingOperation={operationId:string;changes:PendingChange[]};
type Envelope={format:2;tenantId:string;data:LocalData;cursor:number;versions:Record<string,number>;shadow:Record<string,SyncChange>;outbox:PendingOperation[];conflict:SyncChange[];archive:PendingOperation[]};
const collections=['customers','transfers','rates','cash','exchange','wallets'] as const;
let writePermission:()=>boolean|string=()=>false;
export function setLocalWritePermission(check:()=>boolean|string){writePermission=check;}
let tenant='';let failure='';let writable=false;let releaseLock:(()=>void)|undefined;let generation=0;
const fresh=(id:string):Envelope=>({format:2,tenantId:id,data:empty(),cursor:0,versions:{},shadow:{},outbox:[],conflict:[],archive:[]});
let state=fresh('');const listeners=new Set<()=>void>();
const key=()=>`almustaqbal-tenant-data-v2:${tenant}`;
const entityKey=(r:{collection:string;id:string})=>`${r.collection}:${r.id}`;
function notify(){listeners.forEach(l=>l());}
function read():Envelope{
 try{const raw=localStorage.getItem(key());if(!raw)return fresh(tenant);const value=JSON.parse(raw) as Envelope;
 if(value.format!==2||value.tenantId!==tenant||!valid(value.data)||!Array.isArray(value.outbox)||!Array.isArray(value.archive)||!Array.isArray(value.conflict)||!Number.isFinite(value.cursor)||!value.versions)throw Error('invalid');value.shadow??={};return value;
 }catch{failure='تعذر قراءة بيانات هذا التاجر. البيانات محفوظة والحفظ متوقف لحمايتها.';throw Error(failure);}
}
function commit(next:Envelope){localStorage.setItem(key(),JSON.stringify(next));state=next;notify();}
export function activateTenant(id:string|null){
 if(tenant===(id||''))return;generation++;releaseLock?.();releaseLock=undefined;writable=false;tenant=id||'';failure='';
 try{state=tenant?read():fresh('');}catch{state=fresh(tenant);}notify();
 if(!tenant)return;const current=generation;
 if(!navigator.locks){failure='هذا المتصفح لا يدعم قفل التخزين الآمن. افتح التطبيق بمتصفح حديث.';notify();return;}
 void navigator.locks.request(`almustaqbal-data-writer:${tenant}`,async()=>{
  if(current!==generation)return;
  try{state=read();writable=!failure;}catch{/* Preserve unreadable storage. */}notify();
  await new Promise<void>(resolve=>{releaseLock=resolve;});
 });
}
export function subscribeLocal(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
export function getLocalData(){return state.data;}
export function useLocalData(){return useSyncExternalStore(subscribeLocal,getLocalData);}
export function getSyncState(){return state;}
export function localError(){return failure;}
export function canWriteLocal(){return writable&&!failure&&!!tenant;}
function records(data:LocalData){const result=new Map<string,{collection:string;id:string;value:unknown}>();for(const collection of collections)for(const row of data[collection]||[])result.set(`${collection}:${row.id}`,{collection,id:row.id,value:row});result.set('rateLog:history',{collection:'rateLog',id:'history',value:{rows:data.rateLog||[]}});return result;}
export function updateLocal(update:(current:LocalData)=>LocalData){
 const permission=writePermission();if(permission!==true){window.alert(typeof permission==='string'?permission:'أنت غير مشترك. الحفظ متوقف ويمكنك عرض البيانات.');return false;}
 if(!canWriteLocal()){window.alert(failure||'الحفظ متاح في تبويبة واحدة لحماية البيانات. أغلق تبويبة التاجر الأخرى ثم أعد المحاولة.');return false;}
 try{const latest=read();const next=update(structuredClone(latest.data));if(!valid(next))throw Error('invalid');const before=records(latest.data),after=records(next);const changes:PendingChange[]=[];
 for(const id of new Set([...before.keys(),...after.keys()])){const a=before.get(id),b=after.get(id);if(JSON.stringify(a?.value)!==JSON.stringify(b?.value)){const row=b||a!;changes.push({collection:row.collection,id:row.id,value:b?.value??null,baseVersion:latest.versions[id]||0});}}
 if(changes.length>100||new TextEncoder().encode(JSON.stringify(changes)).byteLength>120000){window.alert('التعديل كبير جدًا للمزامنة الآمنة. لم يُحفظ؛ قلّل عدد السجلات أو طول الملاحظات ثم أعد المحاولة. سجل الأسعار السابق محفوظ بالكامل.');return false;}
 if(changes.length)commit({...latest,data:next,outbox:[...latest.outbox,{operationId:crypto.randomUUID(),changes}]});return true;
 }catch{window.alert('لم يتم الحفظ. البيانات السابقة محفوظة؛ تحقق من مساحة التخزين.');return false;}
}
function apply(data:LocalData,change:SyncChange){
 if(change.collection==='rateLog'){data.rateLog=(change.value as {rows:LocalRate[]}|null)?.rows||[];return;}
 if(!collections.includes(change.collection as typeof collections[number]))throw Error('Unknown collection');
 const c=change.collection as typeof collections[number];const rows=(data[c]||[]).filter(r=>r.id!==change.id);if(change.value!==null)rows.push(change.value as never);Object.assign(data,{[c]:rows});
}
export function receiveRemote(id:string,cursor:number,changes:SyncChange[]){
 if(id!==tenant||!canWriteLocal())return;const latest=read();const next=structuredClone(latest);const pending=new Set(latest.outbox.flatMap(o=>o.changes.map(entityKey)));
 for(const change of changes){const k=entityKey(change);if(change.version<(next.versions[k]||0))continue;next.versions[k]=change.version;next.shadow[k]=change;if(!pending.has(k))apply(next.data,change);}
 next.cursor=cursor;if(!valid(next.data))throw Error('Invalid cloud data');commit(next);
}
export function acknowledgeOperation(id:string,operationId:string,cursor:number){
 if(id!==tenant||!canWriteLocal())return;const latest=read();const op=latest.outbox.find(o=>o.operationId===operationId);if(!op)return;const changed=new Set(op.changes.map(entityKey));
 const versions={...latest.versions};for(const k of changed)versions[k]=Math.max(versions[k]||0,cursor);
 const outbox=latest.outbox.filter(o=>o.operationId!==operationId).map(o=>({...o,changes:o.changes.map(c=>changed.has(entityKey(c))?{...c,baseVersion:cursor}:c)}));
 const data=structuredClone(latest.data);const stillPending=new Set(outbox.flatMap(o=>o.changes.map(entityKey)));for(const k of changed){const remote=latest.shadow[k];if(!stillPending.has(k)&&remote&&remote.version>=cursor)apply(data,remote);}
 if(!valid(data))throw Error('Invalid cloud data');commit({...latest,data,versions,outbox});
}
export function recordConflict(id:string,conflicts:SyncChange[]){if(id===tenant&&canWriteLocal())commit({...read(),conflict:conflicts});}
export function resolveConflict(choice:'local'|'remote'){
 if(!canWriteLocal())return;const latest=read();if(!latest.conflict.length)return;const next=structuredClone(latest);const keys=new Set(next.conflict.map(entityKey));next.archive.push(...next.outbox.filter(o=>o.changes.some(c=>keys.has(entityKey(c)))));
 for(const conflict of next.conflict){next.versions[entityKey(conflict)]=conflict.version;if(choice==='remote')apply(next.data,conflict);}
 next.outbox=next.outbox.map(o=>({...o,operationId:crypto.randomUUID(),changes:o.changes.filter(c=>choice==='local'||!keys.has(entityKey(c))).map(c=>keys.has(entityKey(c))?{...c,baseVersion:next.versions[entityKey(c)]||0}:c)})).filter(o=>o.changes.length);next.conflict=[];
 if(!valid(next.data))throw Error('Invalid conflict data');commit(next);
}
window.addEventListener('storage',e=>{if(tenant&&e.key===key()){try{state=read();}catch{/* Preserve prior view. */}notify();}});
export function localDate(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,19);}

window.addEventListener('tenant-deleted',event=>{const id=(event as CustomEvent<{merchantId:string}>).detail?.merchantId;if(!id)return;if(id===tenant)activateTenant(null);localStorage.removeItem(`almustaqbal-tenant-data-v2:${id}`);});

export function exportLocalBackup(){
 if(!tenant||failure)throw Error('تعذر قراءة بيانات الحساب بأمان.');
 const data=structuredClone(read().data);
 return {format:'almustaqbal-backup',version:1,tenantId:tenant,createdAt:new Date().toISOString(),data};
}
