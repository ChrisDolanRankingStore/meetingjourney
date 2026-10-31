/** Refresh only this app's public files. Personal data lives in IndexedDB/localStorage and is never touched. */
export async function refreshAppFiles(environment) {
  const {origin,fetch:request,caches:publicCaches,serviceWorker}=environment;
  const response=await request(new URL('/health',origin).href,{cache:'no-store'});
  if(!response.ok)throw Error('The app server is unavailable. Try again when connected.');
  const health=await response.json();
  if(health.service!=='meeting-journey-node'||health.status!=='ok')throw Error('The app server did not return a valid update check.');
  if(serviceWorker){
    const registrations=await serviceWorker.getRegistrations();
    for(const registration of registrations){
      const worker=registration.active??registration.waiting??registration.installing;
      if(worker&&registration.scope===new URL('/',origin).href&&new URL(worker.scriptURL).pathname==='/sw.js')await registration.unregister();
    }
  }
  if(publicCaches)for(const key of await publicCaches.keys())if(key.startsWith('meeting-journey-'))await publicCaches.delete(key);
  if(serviceWorker){
    const registration=await serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
    const worker=registration.installing??registration.waiting??registration.active;
    if(worker&&worker.state!=='activated')await new Promise((resolve,reject)=>{
      const cleanup=()=>{clearTimeout(timer);worker.removeEventListener('statechange',change);};
      const change=()=>{if(worker.state==='activated'){cleanup();resolve();}else if(worker.state==='redundant'){cleanup();reject(Error('Could not install the update. Please try again.'));}};
      const timer=setTimeout(()=>{cleanup();reject(Error('The update took too long. Please try again.'));},20000);
      worker.addEventListener('statechange',change);change();
    });
  }
}

if(typeof document!=='undefined'){
  const button=document.querySelector('[data-refresh-app]'),status=document.querySelector('[data-refresh-status]');
  button?.addEventListener('click',async()=>{
    button.disabled=true;status.textContent='Updating app files… / Actualizando los archivos…';
    try{
      await refreshAppFiles({origin:location.origin,fetch:window.fetch.bind(window),caches:window.caches,serviceWorker:navigator.serviceWorker});
      status.textContent='Ready. Opening your journal… / Listo. Abriendo tu diario…';
      location.replace('/?app-update='+Date.now());
    }catch(error){status.textContent='Update could not finish. Your journal has not been deleted. Try again when online. / No se pudo actualizar. Tu diario no se ha borrado. Inténtalo con conexión.';button.disabled=false;}
  });
}
