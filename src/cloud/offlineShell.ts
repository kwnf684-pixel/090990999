export function registerOfflineShell(){
 if(import.meta.env.DEV||!('serviceWorker' in navigator))return;
 void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).catch(()=>{/* Online app remains available when offline installation fails. */});
}
export async function activateOfflineUpdate(){
 if(!('serviceWorker' in navigator))return;
 const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);if(!registration)return;
 await registration.update();
 if(registration.installing)await new Promise<void>(resolve=>{const worker=registration.installing!;const timer=setTimeout(resolve,15000);worker.addEventListener('statechange',()=>{if(worker.state==='installed'||worker.state==='redundant'){clearTimeout(timer);resolve();}});});
 if(registration.waiting)await new Promise<void>(resolve=>{const timer=setTimeout(resolve,5000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve();},{once:true});registration.waiting!.postMessage('ACTIVATE_UPDATE');});
}
