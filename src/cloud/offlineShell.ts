export function registerOfflineShell(){
 if(import.meta.env.DEV||!('serviceWorker' in navigator))return;
 void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).catch(()=>{/* Online app remains available when offline installation fails. */});
}
function waitForWorker(worker:ServiceWorker,finished:()=>boolean,timeout:number){
 return new Promise<void>((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('statechange',check);};
  const check=()=>{if(worker.state==='redundant'){cleanup();reject(new Error('Update installation failed'));}else if(finished()){cleanup();resolve();}};
  const timer=setTimeout(()=>{cleanup();reject(new Error('Update timed out'));},timeout);
  worker.addEventListener('statechange',check);check();
 });
}
export async function activateOfflineUpdate(){
 if(!('serviceWorker' in navigator))return;
 const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);if(!registration)return;
 await registration.update();
 const installing=registration.installing;
 if(installing)await waitForWorker(installing,()=>installing.state==='installed'||installing.state==='activated',60000);
 const waiting=registration.waiting;
 if(waiting){
  await new Promise<void>((resolve,reject)=>{
   const cleanup=()=>{clearTimeout(timer);navigator.serviceWorker.removeEventListener('controllerchange',check);waiting.removeEventListener('statechange',check);};
   const check=()=>{if(navigator.serviceWorker.controller===waiting){cleanup();resolve();}else if(waiting.state==='redundant'){cleanup();reject(new Error('Update activation failed'));}};
   const timer=setTimeout(()=>{cleanup();reject(new Error('Update activation timed out'));},30000);
   navigator.serviceWorker.addEventListener('controllerchange',check);waiting.addEventListener('statechange',check);
   waiting.postMessage('ACTIVATE_UPDATE');check();
  });
 }
}
