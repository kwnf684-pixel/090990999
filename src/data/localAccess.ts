import {cacheOfflineAccess,openOfflineAccess,clearOfflineAccess} from './offlineAccess';
import {activateTenant,setLocalWritePermission} from './localStore';
import {client,ref} from '../cloud/client';
export type CloudSession={token:string;merchantId:string;name:string;expiresAt:number;sessionExpiresAt:number;role:'admin'|'merchant';offlineUntil:number};
const role='merchant' as CloudSession['role'];
const key='almustaqbal-merchant-cloud-session-v1';
const listeners=new Set<()=>void>();
let session:CloudSession|null=null;
let checked=false;
let failure='';
// Only retain the current credential in page memory, never browser storage or cloud responses.
let rememberedPassword:{token:string;value:string}|null=null;
export function currentSessionPassword(){return session&&rememberedPassword?.token===session.token?rememberedPassword.value:'';}
// Restore this tab only; offline credentials remain encrypted separately.
try{localStorage.removeItem(key);const raw=sessionStorage.getItem(key);if(raw){const saved=JSON.parse(raw);if(saved.role==='merchant'&&typeof saved.token==='string'&&typeof saved.merchantId==='string'&&Date.now()<Math.min(saved.sessionExpiresAt,saved.offlineUntil))session=saved;}}catch{/* Login remains available. */}
let loginPhone='';
let version=0;export const accessVersion=()=>version;const emit=()=>{version++;listeners.forEach(fn=>fn());};
export function getSession(){return session;}
export function accessError(){return failure;}
export function subscribeAccess(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function isUnlocked(){return !!session&&(checked||role==='merchant')&&Date.now()<session.sessionExpiresAt;}
function persist(next:CloudSession|null){if(!next||rememberedPassword?.token!==next.token)rememberedPassword=null;try{if(next)sessionStorage.setItem(key,JSON.stringify(next));else sessionStorage.removeItem(key);}catch{/* Memory session remains available. */}session=next;activateTenant(next?.merchantId||null);emit();}
export async function loginLocal(phone:string,password:string){loginPhone=phone;if(!navigator.onLine){const saved=await openOfflineAccess(phone,password);checked=false;failure='';persist(saved);rememberedPassword={token:saved.token,value:password};emit();return true;}if(!client)throw Error('لم يتم ضبط اتصال الخادم.');const result=await client.action(ref<'action'>('auth:login'),{role,phone,password}) as Omit<CloudSession,'offlineUntil'>;checked=true;failure='';persist({...result,offlineUntil:Math.min(Date.now()+86400000,result.sessionExpiresAt,result.sessionExpiresAt)});rememberedPassword={token:result.token,value:password};try{await cacheOfflineAccess(phone,password,session!);}catch{failure='تم الدخول، لكن تعذر تجهيز الدخول دون إنترنت على هذا الجهاز.';}emit();watchSession();return true;}
let unwatch:(()=>void)|undefined;
function stopWatching(){const stop=unwatch;unwatch=undefined;stop?.();}
function watchSession(){stopWatching();if(!client||!session||!navigator.onLine)return;const token=session.token;const watch=client.watchQuery(ref<'query'>('access:status'),{token});unwatch=watch.onUpdate(()=>{try{const result=watch.localQueryResult();if(result===undefined)return;checked=true;if(result.status!=='active'&&result.status!=='expired'){failure=result.status==='frozen'?'الحساب مجمّد. تواصل مع الإدارة.':result.status==='deleted'?'تم حذف الحساب بواسطة الإدارة.':'انتهت الجلسة أو مهلة الاشتراك. تواصل مع الإدارة.';if(result.status==='deleted'&&session)window.dispatchEvent(new CustomEvent('tenant-deleted',{detail:{merchantId:session.merchantId}}));clearOfflineAccess();persist(null);stopWatching();return;}if(session?.token===token)persist({...session,...result,token,offlineUntil:Math.min(Date.now()+86400000,result.sessionExpiresAt,result.sessionExpiresAt)});}catch{failure='تعذر التحقق من الحساب. تحقق من اتصالك.';emit();}});}
export async function logoutLocal(){clearOfflineAccess();const previous=session;persist(null);checked=false;stopWatching();if(client&&previous)try{await client.mutation(ref<'mutation'>('access:logout'),{token:previous.token});}catch{/* Session expires server-side; this device is signed out. */}}
export async function revokeSession(){persist(null);checked=false;stopWatching();}
export async function changeLocalPassword(current:string,next:string){if(!client||!session)throw Error('سجّل الدخول أولًا.');const token=session.token;await client.action(ref<'action'>('auth:changePassword'),{token,current,password:next});if(session?.token===token){rememberedPassword={token,value:next};clearOfflineAccess();if(loginPhone)try{await cacheOfflineAccess(loginPhone,next,session);}catch{failure='يلزم تسجيل الدخول مجددًا لتجهيز الوصول دون إنترنت.';}emit();}return true;}
export function subscriptionEnd(){return session?new Date(session.expiresAt).toISOString():'';}
export function subscriptionRemaining(){return session?Math.max(0,Math.ceil((session.expiresAt-Date.now())/86400000)):null;}
activateTenant(session?.merchantId||null);
watchSession();
window.addEventListener('online',()=>{watchSession();emit();});
window.addEventListener('offline',emit);
setInterval(emit,30000);

window.addEventListener('cloud-access-rejected',()=>{watchSession();});

setLocalWritePermission(()=>{if(!session||!isUnlocked())return 'سجّل الدخول للتحقق من صلاحية الحساب.';if(Date.now()>=session.expiresAt)return 'أنت غير مشترك. جدّد الاشتراك لإضافة أو تعديل البيانات.';if(Date.now()>=session.offlineUntil)return 'اتصل بالإنترنت لتجديد صلاحية العمل دون اتصال. بياناتك محفوظة ويمكنك عرضها.';return true;});
setInterval(()=>{if(checked&&session&&client?.connectionState().isWebSocketConnected&&Date.now()<session.sessionExpiresAt){persist({...session,offlineUntil:Math.min(Date.now()+86400000,session.sessionExpiresAt)});}},3600000);
