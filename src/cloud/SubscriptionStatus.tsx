import {useEffect,useState,useSyncExternalStore} from 'react';
import {accessVersion,getSession,subscribeAccess} from '../data/localAccess';
import './subscription.css';
export default function SubscriptionStatus({visible=true}:{visible?:boolean}){
 useSyncExternalStore(subscribeAccess,accessVersion);
 const session=getSession();const [notice,setNotice]=useState('');const [now,setNow]=useState(Date.now);useEffect(()=>{const update=()=>setNow(Date.now());const timer=setInterval(update,30000);const unsubscribe=subscribeAccess(update);return()=>{clearInterval(timer);unsubscribe();};},[]);
 const remaining=session?Math.max(0,Math.ceil((session.expiresAt-now)/86400000)):0;
 const expired=remaining===0;
 useEffect(()=>{if(!expired)return;
  const controls=new Map<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement,boolean>();
  const lock=()=>{document.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('.app-shell input,.app-shell textarea,.app-shell select,dialog input,dialog textarea,dialog select').forEach(el=>{if(!controls.has(el)){controls.set(el,el.disabled);el.disabled=true;el.setAttribute('data-subscription-locked','true');}});};
  lock();const observer=new MutationObserver(lock);observer.observe(document.body,{childList:true,subtree:true});
  const warn=(e:Event)=>{const target=e.target as Element;if(target.closest('[data-subscription-locked]')){e.preventDefault();setNotice('أنت غير مشترك. جدّد الاشتراك لتتمكن من إدخال بيانات جديدة.');}};
  document.addEventListener('pointerdown',warn,true);
  return()=>{observer.disconnect();document.removeEventListener('pointerdown',warn,true);controls.forEach((disabled,el)=>{el.disabled=disabled;el.removeAttribute('data-subscription-locked');});};
 },[expired]);
 if(!visible)return notice?<p className="tl-error" role="alert">{notice}<button type="button" onClick={()=>setNotice('')} aria-label="إغلاق التنبيه">×</button></p>:null;
 return <section className={`subscription-banner ${expired?'expired':'pro'}`} aria-label="حالة الاشتراك"><span className="subscription-emblem" aria-hidden="true">{expired?'◷':'✦'}</span><div><strong>{expired?'تم انتهاء اشتراكك':'PRO · مشترك'}</strong><small>{expired?'العرض متاح؛ الإضافة والتعديل متوقفان حتى التجديد.':`باقي ${remaining} يوم من الاشتراك`}</small></div>{expired&&<a href="https://wa.me/9647741112113" target="_blank" rel="noopener noreferrer">تجديد الاشتراك</a>}{notice&&<p role="alert">{notice}<button type="button" onClick={()=>setNotice('')} aria-label="إغلاق التنبيه">×</button></p>}</section>;
}
