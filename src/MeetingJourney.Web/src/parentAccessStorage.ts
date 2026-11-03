const key='mj-parent-pin';
type StoredPin={salt:string;digest:string};
function storedPin():StoredPin|null{try{const value=localStorage.getItem(key);if(!value)return null;const parsed=JSON.parse(value) as StoredPin;return typeof parsed.salt==='string'&&typeof parsed.digest==='string'?parsed:null;}catch{return null;}}
export function hasParentPin(){return storedPin()!==null;}
async function digest(pin:string,salt:string){const keyMaterial=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);const result=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:120000,hash:'SHA-256'},keyMaterial,256);return [...new Uint8Array(result)].map(value=>value.toString(16).padStart(2,'0')).join('');}
export async function setParentPin(pin:string){if(!/^\d{4}$/.test(pin))throw new Error('Enter exactly four digits.');const salt=crypto.getRandomValues(new Uint8Array(16));const saltText=[...salt].map(value=>value.toString(16).padStart(2,'0')).join('');localStorage.setItem(key,JSON.stringify({salt:saltText,digest:await digest(pin,saltText)}));}
export async function verifyParentPin(pin:string){const stored=storedPin();return Boolean(stored&&/^\d{4}$/.test(pin)&&await digest(pin,stored.salt)===stored.digest);}
export function removeParentPin(){localStorage.removeItem(key);}
