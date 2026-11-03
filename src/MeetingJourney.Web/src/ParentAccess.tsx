import {useState,type ReactNode} from 'react';
import {t} from './i18n';
import {hasParentPin,removeParentPin,setParentPin,verifyParentPin} from './parentAccessStorage';

export function ParentPinGate({children}:{children:ReactNode}){
 const[open,setOpen]=useState(()=>!hasParentPin()),[pin,setPin]=useState(''),[error,setError]=useState('');
 if(open)return <>{children}</>;
 return <section className="parent-pin-gate"><label>{t('Parent or carer 4-digit code')}<input type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={4} value={pin} onChange={event=>setPin(event.target.value.replace(/\D/g,'').slice(0,4))}/></label><button type="button" disabled={pin.length!==4} onClick={()=>void verifyParentPin(pin).then(valid=>{if(valid){setOpen(true);setError('');setPin('');}else setError('That code did not match.');}).catch(()=>setError('Could not check the code on this device.'))}>{t('Continue')}</button>{error&&<p role="alert">{t(error)}</p>}</section>;
}

export function ParentAccessControls(){
 const[pin,setPin]=useState(''),[confirm,setConfirm]=useState(''),[current,setCurrent]=useState(''),[message,setMessage]=useState(''),[hasPin,setHasPin]=useState(hasParentPin);
 return <section className="parent-access-controls"><h3>{t('Optional parent lock')}</h3><p>{t('A four-digit code can protect Settings, programme import and backup restore. The journey stays available without it.')}</p><small>{t('This is a convenience lock, not encryption. It stays on this device and is not included in backups.')}</small>
  {hasPin&&<label>{t('Current code')}<input type="password" inputMode="numeric" maxLength={4} value={current} onChange={event=>setCurrent(event.target.value.replace(/\D/g,'').slice(0,4))}/></label>}
  <label>{t(hasPin?'New four-digit code':'Set a four-digit code')}<input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={event=>setPin(event.target.value.replace(/\D/g,'').slice(0,4))}/></label>
  <label>{t('Confirm code')}<input type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={event=>setConfirm(event.target.value.replace(/\D/g,'').slice(0,4))}/></label>
  <button type="button" disabled={pin.length!==4||confirm.length!==4||pin!==confirm||hasPin&&current.length!==4} onClick={()=>void (async()=>{if(hasPin&&!await verifyParentPin(current)){setMessage('That code did not match.');return;}try{await setParentPin(pin);setHasPin(true);setCurrent('');setPin('');setConfirm('');setMessage('Code saved on this device.');}catch(error){setMessage(error instanceof Error?error.message:'Could not save the code.');}})()}>{t(hasPin?'Change parent code':'Set parent code')}</button>
  {hasPin&&<button type="button" disabled={current.length!==4} onClick={()=>void verifyParentPin(current).then(valid=>{if(!valid){setMessage('That code did not match.');return;}removeParentPin();setHasPin(false);setCurrent('');setMessage('Parent lock removed.');}).catch(()=>setMessage('Could not check the code on this device.'))}>{t('Remove parent lock')}</button>}
  <p role="status">{t(message)}</p>
 </section>;
}

export function ParentUnlock({onUnlocked,onCancel}:{onUnlocked:()=>void;onCancel:()=>void}){
 const[pin,setPin]=useState(''),[error,setError]=useState('');
 return <main className="parent-unlock-screen"><h1>{t('Parent or carer access')}</h1><p>{t('Enter the four-digit code to open Settings.')}</p><label>{t('4-digit code')}<input autoFocus type="password" inputMode="numeric" maxLength={4} value={pin} onChange={event=>setPin(event.target.value.replace(/\D/g,'').slice(0,4))}/></label><button type="button" disabled={pin.length!==4} onClick={()=>void verifyParentPin(pin).then(valid=>{if(valid)onUnlocked();else setError('That code did not match.');}).catch(()=>setError('Could not check the code on this device.'))}>{t('Continue')}</button><button type="button" onClick={onCancel}>{t('Back to my journey')}</button>{error&&<p role="alert">{t(error)}</p>}</main>;
}
