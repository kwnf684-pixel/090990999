import type {CloudSession} from './localAccess';
const key='almustaqbal-offline-access-v1';
const phoneKey=(phone:string)=>{let p=phone.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[^0-9]/g,'');if(p.startsWith('00'))p=p.slice(2);if(p.startsWith('07'))p='964'+p.slice(1);return p;};
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const base64=(v:Uint8Array)=>btoa(String.fromCharCode(...v));
async function derive(password:string,salt:Uint8Array){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt as BufferSource,iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export function clearOfflineAccess(){try{localStorage.removeItem(key);}catch{/* No cached access. */}}
export async function cacheOfflineAccess(phone:string,password:string,session:CloudSession){const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await derive(password,salt),new TextEncoder().encode(JSON.stringify(session)));localStorage.setItem(key,JSON.stringify({phone:phoneKey(phone),salt:base64(salt),iv:base64(iv),cipher:base64(new Uint8Array(cipher))}));}
export async function openOfflineAccess(phone:string,password:string):Promise<CloudSession>{
 try{const raw=JSON.parse(localStorage.getItem(key)||'null');if(!raw||raw.phone!==phoneKey(phone))throw Error();const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(raw.iv) as BufferSource},await derive(password,bytes(raw.salt)),bytes(raw.cipher) as BufferSource);const s=JSON.parse(new TextDecoder().decode(plain)) as CloudSession;if(s.role!=='merchant'||!s.token||!s.merchantId||!Number.isFinite(s.offlineUntil)||!Number.isFinite(s.sessionExpiresAt)||Date.now()>=Math.min(s.offlineUntil,s.sessionExpiresAt))throw Error();return s;}catch{throw Error('تعذر الدخول دون إنترنت. تحقق من الرقم وكلمة المرور؛ يلزم دخول ناجح سابقًا على هذا الجهاز خلال آخر 24 ساعة.');}
}
