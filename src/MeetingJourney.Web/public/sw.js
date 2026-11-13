const CACHE = 'meeting-journey-107-compact-drawing';
const APP_SHELL=['/','/index.html','/manifest.webmanifest','/journey-route-192.png','/journey-route-180.png','/journey-route-512.png','/privacy.html','/about.html','/welcome.html','/info.css','/refresh.html','/app-refresh.js','/es/privacy.html','/es/about.html','/es/welcome.html', .../*BUILD_ASSETS*/[]];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting();});
function adminPath(path){try{path=decodeURIComponent(path);}catch{return false;}return path==='/admin'||path.startsWith('/admin/')||path==='/api/admin'||path.startsWith('/api/admin/');}
async function removeAdminCache(){for(const key of await caches.keys())if(key.startsWith('meeting-journey-')){const cache=await caches.open(key);await Promise.all((await cache.keys()).filter(request=>adminPath(new URL(request.url).pathname)).map(request=>cache.delete(request)));}}
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('meeting-journey-')&&key!==CACHE).map(key=>caches.delete(key)))).then(removeAdminCache).then(()=>self.clients.claim())));
async function storeResponse(request,response){if(response.ok&&response.type!=='opaque'){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return;}
 if(adminPath(pathname))return;
 if(pathname==='/api/colouring'||pathname.startsWith('/api/colouring/'))return;
 const documentRequest=request.mode==='navigate';const api=url.pathname.startsWith('/api/');
 event.respondWith((async()=>{
  if(documentRequest||api){try{return await storeResponse(request,await fetch(request));}catch{const publicPage=({'/privacy':'/privacy.html','/about':'/about.html','/welcome':'/welcome.html','/refresh':'/refresh.html'})[url.pathname];const cached=(await caches.match(request))??(publicPage?await caches.match(publicPage):undefined)??(!api?await caches.match('/index.html'):undefined);return cached??new Response(api?'\u007b"error":"Meeting not cached"\u007d':'This page has not been saved offline.',{status:503,headers:{'Content-Type':api?'application/json':'text/plain'}});}}
  const cached=await caches.match(request);if(cached)return cached;
  try{return await storeResponse(request,await fetch(request));}catch{return new Response('Resource is not available offline.',{status:503,headers:{'Content-Type':'text/plain'}});}
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='ADMIN_NETWORK_ONLY'){event.waitUntil(removeAdminCache().then(()=>event.ports[0]?.postMessage({adminNetworkOnly:true})));return;}
 if(event.data?.type!=='SAVE_MEETING')return;
 const port=event.ports[0];event.waitUntil((async()=>{try{const urls=event.data.urls;if(!Array.isArray(urls)||urls.length>60)throw Error('Invalid offline list');for(const item of urls){const url=new URL(item,self.location.origin);if(url.origin!==self.location.origin||(!url.pathname.startsWith('/assets/')&&url.pathname!=='/api/meetings/current'))throw Error('Only public meeting resources may be cached');const request=new Request(url,{cache:'reload'}),response=await fetch(request);if(!response.ok)throw Error('Download failed');await storeResponse(request,response);}port?.postMessage({ok:true});}catch{port?.postMessage({ok:false});}})());
});
