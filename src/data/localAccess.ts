const key='almustaqbal-local-access-v1';
const sessionKey='almustaqbal-local-session-v1';
type Credential={phone:string;salt:string;hash:string};
const initial:Credential={phone:'07700197478',salt:'almustaqbal-local-initial-v1',hash:'64d3cc1c15f2003733d24b64797df225245d12c4827a9e2403157984e5cffc26'};
function credential():Credential{const saved=localStorage.getItem(key);if(!saved)return initial;const c=JSON.parse(saved);if(typeof c.phone!=='string'||typeof c.salt!=='string'||typeof c.hash!=='string')throw Error('تعذر قراءة إعدادات الدخول المحلية.');return c;}
async function hash(password:string,salt:string){const bytes=new TextEncoder();const material=await crypto.subtle.importKey('raw',bytes.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes.encode(salt),iterations:150000,hash:'SHA-256'},material,256);return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');}
export function isUnlocked(){try{return sessionStorage.getItem(sessionKey)===credential().hash;}catch{return false;}}
export async function loginLocal(phone:string,password:string){const c=credential();if(phone.trim().replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))!==c.phone||await hash(password,c.salt)!==c.hash)return false;if(!localStorage.getItem(subscriptionKey))localStorage.setItem(subscriptionKey,subscriptionEnd());sessionStorage.setItem(sessionKey,c.hash);window.dispatchEvent(new Event('local-access'));return true;}
export async function changeLocalPassword(current:string,next:string){const c=credential();if(await hash(current,c.salt)!==c.hash)return false;const salt=crypto.randomUUID();const updated={...c,salt,hash:await hash(next,salt)};localStorage.setItem(key,JSON.stringify(updated));sessionStorage.setItem(sessionKey,updated.hash);window.dispatchEvent(new Event('local-access'));return true;}
export function logoutLocal(){sessionStorage.removeItem(sessionKey);window.dispatchEvent(new Event('local-access'));}
export function subscribeAccess(listener:()=>void){window.addEventListener('storage',listener);window.addEventListener('local-access',listener);return()=>{window.removeEventListener('storage',listener);window.removeEventListener('local-access',listener);};}

const subscriptionKey='almustaqbal-subscription-end-v1';
export function subscriptionEnd(){return localStorage.getItem(subscriptionKey)||'2026-10-09T23:59:59+03:00';}
export function subscriptionRemaining(){const end=new Date(subscriptionEnd());if(!Number.isFinite(end.getTime()))return null;const today=new Date();const endDate=new Date(end.getFullYear(),end.getMonth(),end.getDate());const startDate=new Date(today.getFullYear(),today.getMonth(),today.getDate());return Math.max(0,Math.round((endDate.getTime()-startDate.getTime())/86400000));}
