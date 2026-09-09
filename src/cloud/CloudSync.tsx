import {useEffect,useState,useSyncExternalStore} from 'react';
import {client,ref} from './client';
import {getSession,subscribeAccess} from '../data/localAccess';
import {acknowledgeOperation,canWriteLocal,getSyncState,localError,receiveRemote,recordConflict,resolveConflict,subscribeLocal} from '../data/localStore';
import type {SyncChange} from '../data/localStore';
import {FinanceModal} from '../components/FinanceViews';
import './sync.css';
type Pull={cursor:number;changes:SyncChange[];hasMore?:boolean};
type Push={ok:true;cursor:number}|{ok:false;conflicts:SyncChange[]};
export default function CloudSync(){
 const state=useSyncExternalStore(subscribeLocal,getSyncState);
 const identity=useSyncExternalStore(subscribeAccess,()=>getSession()?.merchantId||'');
 const [status,setStatus]=useState('جارٍ تجهيز المزامنة');const [details,setDetails]=useState(false);
 useEffect(()=>{
  let stopped=false,busy=false,retry=0;let timeout:ReturnType<typeof setTimeout>|undefined;let slowTimer:ReturnType<typeof setTimeout>|undefined;
  let connected=client?.connectionState().isWebSocketConnected??false;
  const schedule=(delay:number)=>{clearTimeout(timeout);timeout=setTimeout(()=>void sync(),delay);};
  async function sync(){
   if(stopped||busy)return;if(document.visibilityState==='hidden'){schedule(60000);return;}const session=getSession();if(!session||session.merchantId!==identity)return;
   if(!canWriteLocal()){setStatus(localError()||'قراءة فقط: البيانات مفتوحة في تبويبة أخرى');schedule(2000);return;}
   if(!client){setStatus('الاتصال السحابي غير مهيأ');return;}
   if(!connected){setStatus('الاتصال بالسحابة غير متاح · العمليات محفوظة على الجهاز بانتظار الاتصال');schedule(30000);return;}
   if(getSyncState().conflict.length){setStatus('توجد تعديلات متعارضة تحتاج مراجعتك');return;}
   busy=true;setStatus('جارٍ مزامنة البيانات');
   slowTimer=setTimeout(()=>{if(!stopped&&busy)setStatus(connected?'استجابة السحابة بطيئة · العمليات محفوظة، ننتظر التأكيد':'الاتصال بالسحابة غير متاح · العمليات محفوظة على الجهاز بانتظار الاتصال');},15000);
   try{
    const sessionArgs={token:session.token};const head=await client.query(ref<'query'>('sync:head'),sessionArgs) as {cursor:number};
    while(!stopped&&connected&&getSyncState().tenantId===identity&&getSyncState().cursor<head.cursor){
     const pull=await client.query(ref<'query'>('sync:pull'),{...sessionArgs,since:getSyncState().cursor}) as Pull;
     receiveRemote(identity,pull.cursor,pull.changes);if(!pull.hasMore)break;
    }
    if(session.expiresAt<=Date.now()){setStatus('الاشتراك منتهٍ · عرض البيانات متاح والعمليات المعلقة محفوظة');return;}
    let count=0;
    while(!stopped&&connected&&getSyncState().tenantId===identity&&getSyncState().outbox.length&&count++<20){
     const operation=getSyncState().outbox[0];const result=await client.mutation(ref<'mutation'>('sync:push'),{...sessionArgs,...operation}) as Push;
     if(!result.ok){recordConflict(identity,result.conflicts);setStatus('توجد تعديلات متعارضة تحتاج مراجعتك');return;}
     acknowledgeOperation(identity,operation.operationId,result.cursor);
    }
    retry=0;if(!connected){setStatus('الاتصال بالسحابة غير متاح · العمليات محفوظة على الجهاز بانتظار الاتصال');return;}setStatus(getSyncState().outbox.length?'تستمر مزامنة العمليات المحفوظة':'تمت المزامنة · البيانات محفوظة محليًا وسحابيًا');
   }catch(error){
    const message=error instanceof Error?error.message:'';
    if(/SUBSCRIPTION_EXPIRED/.test(message)){setStatus('الاشتراك منتهٍ · العمليات المعلقة محفوظة حتى التجديد');}
    else if(/(ACCESS_REVOKED|UNAUTHORIZED|SESSION_EXPIRED|MERCHANT_FROZEN|MERCHANT_DELETED)/.test(message)){window.dispatchEvent(new Event('cloud-access-rejected'));setStatus('يلزم التحقق من صلاحية الحساب عبر الإنترنت');}
    else setStatus('تعذرت المزامنة · بيانات الجهاز محفوظة وسنعيد المحاولة');
    retry=Math.min(retry+1,5);
   }finally{clearTimeout(slowTimer);busy=false;if(!stopped)schedule(session.expiresAt>Date.now()&&getSyncState().outbox.length?Math.min(3000*2**retry,60000):60000);}
  }
  const request=()=>{if(!busy)schedule(500);};
  const unsubscribeConnection=client?.subscribeToConnectionState(connection=>{if(stopped||connected===connection.isWebSocketConnected)return;connected=connection.isWebSocketConnected;if(!connected)setStatus('الاتصال بالسحابة غير متاح · العمليات محفوظة على الجهاز بانتظار الاتصال');else if(busy)setStatus('عاد الاتصال · جارٍ تأكيد المزامنة');else request();});
  const unsubscribe=subscribeLocal(request);window.addEventListener('online',request);window.addEventListener('offline',request);window.addEventListener('focus',request);document.addEventListener('visibilitychange',request);schedule(0);
  return()=>{stopped=true;clearTimeout(timeout);clearTimeout(slowTimer);unsubscribeConnection?.();unsubscribe();window.removeEventListener('online',request);window.removeEventListener('offline',request);window.removeEventListener('focus',request);document.removeEventListener('visibilitychange',request);};
 },[identity]);
 return <aside className="cloud-sync" aria-label="حالة المزامنة"><span role="status">{status}</span><small>{state.outbox.length?`${state.outbox.length} عملية بانتظار الإرسال`:''}</small>{state.conflict.length>0&&<button type="button" onClick={()=>setDetails(true)}>مراجعة التعارض</button>}{details&&<FinanceModal title="مراجعة تعارض البيانات" close={()=>setDetails(false)}><p>عُدّلت هذه السجلات على جهاز آخر. اختر النسخة التي تريد اعتمادها. تُحفظ نسخة من التعديلات المحلية السابقة في أرشيف هذا الجهاز.</p>{state.conflict.map(c=><section key={c.collection+c.id}><h3 dir="ltr">{c.collection} · {c.id}</h3><p>نسخة السحابة</p><pre className="cloud-conflict">{JSON.stringify(c.value,null,2)}</pre><p>تعديلات هذا الجهاز</p><pre className="cloud-conflict">{JSON.stringify(state.outbox.flatMap(o=>o.changes).filter(r=>r.collection===c.collection&&r.id===c.id).map(r=>r.value),null,2)}</pre></section>)}<div className="cloud-actions"><button type="button" onClick={()=>{resolveConflict('local');setDetails(false);}}>اعتماد تعديلات هذا الجهاز</button><button type="button" onClick={()=>{resolveConflict('remote');setDetails(false);}}>اعتماد نسخة السحابة</button><button type="button" onClick={()=>setDetails(false)}>مراجعة لاحقًا</button></div></FinanceModal>}</aside>;
}
