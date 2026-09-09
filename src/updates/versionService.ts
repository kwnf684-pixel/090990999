import {activateOfflineUpdate} from '../cloud/offlineShell';
export const currentVersion = __APP_VERSION__;
export interface Release {version:string;title:string;notes:string[];publishedAt:string}
function parse(version:string){
 const match=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version);
 if(!match)return null;
 const pre=match[4]?.split('.')||[];
 if(pre.some(x=>/^\d+$/.test(x)&&x.length>1&&x.startsWith('0')))return null;
 return {core:match.slice(1,4).map(BigInt),pre};
}
export function compareVersions(a:string,b:string):number|null{
 const x=parse(a),y=parse(b);if(!x||!y)return null;
 for(let i=0;i<3;i++){if(x.core[i]!==y.core[i])return x.core[i]>y.core[i]?1:-1;}
 if(!x.pre.length||!y.pre.length)return x.pre.length===y.pre.length?0:x.pre.length?-1:1;
 for(let i=0;i<Math.max(x.pre.length,y.pre.length);i++){
  const l=x.pre[i],r=y.pre[i];if(l===undefined)return -1;if(r===undefined)return 1;if(l===r)continue;
  const ln=/^\d+$/.test(l),rn=/^\d+$/.test(r);
  if(ln&&rn)return BigInt(l)>BigInt(r)?1:-1;
  if(ln!==rn)return ln?-1:1;return l>r?1:-1;
 }return 0;
}
export async function fetchRelease(signal?:AbortSignal):Promise<Release>{
 const response=await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`,{cache:'no-store',signal});
 if(!response.ok)throw new Error('Version unavailable');
 const data:unknown=await response.json();
 if(!data||typeof data!=='object'||!('version' in data)||typeof data.version!=='string'||compareVersions(data.version,currentVersion)===null)throw new Error('Invalid version');
 const r=data as Record<string,unknown>;
 return {version:data.version,title:typeof r.title==='string'?r.title.slice(0,160):'تحديث جديد للنظام',notes:Array.isArray(r.notes)?r.notes.filter((x):x is string=>typeof x==='string').slice(0,12).map(x=>x.slice(0,400)):[],publishedAt:typeof r.publishedAt==='string'?r.publishedAt:''};
}
export async function reloadLatest(){
 // Refresh the HTML only. Never clear browser storage or unregister workers.
 const url=new URL(window.location.href);url.searchParams.set('_appUpdate',String(Date.now()));
 const probe=new URL(import.meta.env.BASE_URL,window.location.origin);probe.searchParams.set('_appUpdate',String(Date.now()));
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(probe,{cache:'reload',signal:controller.signal});if(!response.ok)throw new Error('Update unavailable');await response.text();await activateOfflineUpdate();window.location.replace(url.href);}finally{clearTimeout(timer);}
}
