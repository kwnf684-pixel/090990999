import {readdirSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import type {Plugin} from 'vite';
export function offlineShell():Plugin{
 let directory='dist';
 return {name:'offline-shell',apply:'build',configResolved(config){directory=config.build.outDir;},closeBundle(){
  const walk=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[relative(directory,join(dir,entry.name)).replaceAll('\\','/')]);
  const files=walk(directory).filter(file=>file==='index.html'||file==='manifest.webmanifest'||file.startsWith('assets/')||/^icon-?\d+\.png$/.test(file));
  const version=Date.now().toString(36);
  writeFileSync(join(directory,'sw.js'),`const PREFIX='almustaqbal-shell-'+encodeURIComponent(self.registration.scope)+'-';const CACHE=PREFIX+'${version}';
const BASE=self.registration.scope;const FILES=${JSON.stringify(files)}.map(f=>new URL(f,BASE).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(n=>n.startsWith(PREFIX)&&n!==CACHE).map(n=>caches.delete(n)));await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(BASE))return;
if(request.mode==='navigate'){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(new URL('index.html',BASE).href))||fetch(request)));return;}
if(FILES.includes(url.href)){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.href,{ignoreVary:true}))||fetch(request)));}
});`);
 }};
}
