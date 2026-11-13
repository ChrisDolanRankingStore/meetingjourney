export interface PublishedArtwork {
  id: string;
  style: 'simple' | 'detailed' | 'manga';
  title: string;
  imageHash: string;
  imageUrl: string;
}
export interface DrawingArtwork {
  hidden?: boolean;
  id: string;
  title: string;
  imageHash: string;
  dataUrl: string;
  width: number;
  height: number;
}
export function validDrawingArtwork(value: unknown): value is DrawingArtwork {
  if(!value||typeof value!=='object')return false;
  const item=value as Record<string,unknown>;
  return (item.hidden===undefined||typeof item.hidden==='boolean')&&typeof item.id==='string'&&/^[a-f0-9-]{36}$/.test(item.id)&&
    typeof item.title==='string'&&item.title.length<=300&&
    typeof item.imageHash==='string'&&/^[a-f0-9]{64}$/.test(item.imageHash)&&
    typeof item.dataUrl==='string'&&item.dataUrl.length<=12*1024*1024&&/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.dataUrl)&&
    typeof item.width==='number'&&Number.isFinite(item.width)&&item.width>0&&item.width<=4096&&
    typeof item.height==='number'&&Number.isFinite(item.height)&&item.height>0&&item.height<=4096;
}
export async function fetchPublishedArtwork(meetingId: string,partId: string,signal: AbortSignal): Promise<PublishedArtwork[]> {
  const response=await fetch(`/api/colouring/${encodeURIComponent(meetingId)}/${encodeURIComponent(partId)}`,{signal,cache:'no-store'});
  // A deployment without artwork administration configured has no published feed.
  if(response.status===404)return [];
  if(!response.ok)throw Error('Published outlines could not be loaded. Try again when online.');
  const value:unknown=await response.json();
  if(!Array.isArray(value)||!value.every((item:unknown)=>{
    if(!item||typeof item!=='object')return false;
    const entry=item as Record<string,unknown>;
    return typeof entry.id==='string'&&/^[a-f0-9-]{36}$/.test(entry.id)&&
      ['simple','detailed','manga'].includes(String(entry.style))&&typeof entry.title==='string'&&entry.title.length<=300&&
      typeof entry.imageHash==='string'&&/^[a-f0-9]{64}$/.test(entry.imageHash)&&entry.imageUrl===`/api/colouring/images/${entry.id}.png`;
  }))throw Error('The published outline list was invalid. Nothing was imported.');
  return value;
}
export function loadDrawingArtwork(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{
    const image=new window.Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(Error('The saved outline could not be opened.'));
    image.src=dataUrl;
  });
}
export async function downloadPublishedArtwork(item: PublishedArtwork): Promise<DrawingArtwork> {
  const response=await fetch(item.imageUrl,{cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('This outline is no longer available. Refresh the outline list.');
  const blob=await response.blob();
  if(blob.type!=='image/png'||blob.size>8*1024*1024)throw Error('This outline is not a supported PNG.');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(hash!==item.imageHash)throw Error('This outline changed. Refresh the outline list before choosing it.');
  const dataUrl=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(Error('The outline could not be saved.'));
    reader.onerror=()=>reject(Error('The outline could not be saved.'));
    reader.readAsDataURL(blob);
  });
  const image=await loadDrawingArtwork(dataUrl);
  const artwork={id:item.id,title:item.title,imageHash:item.imageHash,dataUrl,width:760,height:760*image.naturalHeight/image.naturalWidth};
  if(!validDrawingArtwork(artwork))throw Error('This outline has unsupported dimensions.');
  return artwork;
}
