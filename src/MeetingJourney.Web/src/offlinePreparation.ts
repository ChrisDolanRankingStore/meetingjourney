import {APP_CACHE} from './release';
﻿import {useEffect} from 'react';
import {focusLandscape,sceneImage,portraitImage} from './artwork';
import {sceneAssetsForWeek,readSceneHemisphere} from './sceneSets';
import {paintedIconAssets} from './paintedIcons';
import type {Meeting} from './types';
export function useOfflinePreparation(meeting:Meeting,portrait?:string){
 const hemisphere=readSceneHemisphere();
 useEffect(()=>{
  if(!portrait||!navigator.onLine||!('caches'in window))return;
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
  if(connection?.saveData||['slow-2g','2g'].includes(connection?.effectiveType??''))return;
  const controller=new AbortController();
  const timer=setTimeout(()=>{void(async()=>{
   const cache=await caches.open(APP_CACHE);
   const sources=sceneAssetsForWeek(meeting.weekOf);
   const urls=[...new Set([focusLandscape,...paintedIconAssets,...sources.flatMap(source=>[480,960].map(width=>sceneImage(source,width))),...sources.map(source=>sceneImage(source,1600)),...[180,360,720].map(height=>portraitImage(portrait,height))])];
   for(const url of urls){if(controller.signal.aborted)return;if(await cache.match(url))continue;const response=await fetch(url,{signal:controller.signal});if(!response.ok||response.headers.get('content-type')?.includes('text/html'))continue;await cache.put(url,response);}
  })().catch(()=>undefined);},2500);
  return()=>{clearTimeout(timer);controller.abort();};
 },[meeting.id,meeting.weekOf,portrait,hemisphere]);
}
