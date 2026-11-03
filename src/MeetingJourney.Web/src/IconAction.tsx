import type {ButtonHTMLAttributes, AnchorHTMLAttributes} from 'react';
import {NotebookIcon, type NotebookIconName} from './NotebookIcon';
import {useComfort} from './ComfortSettings';

export function IconAction({icon, label, showLabel = false, visibleLabel = label, className = '', ...props}: {icon: NotebookIconName; label: string; visibleLabel?:string; showLabel?: boolean} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const comfort=useComfort();
  return <button {...props} type="button" className={`icon-action ${className}`} aria-label={label} title={label}><NotebookIcon name={icon} />{(showLabel||comfort.iconLabels)&&<span className="icon-action-label">{visibleLabel}</span>}</button>;
}
export function IconLink({icon, label, className = '', ...props}: {icon: NotebookIconName; label: string} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const comfort=useComfort();
  return <a {...props} className={`icon-action ${className}`} aria-label={label} title={label}><NotebookIcon name={icon} />{comfort.iconLabels&&<span className="icon-action-label">{label}</span>}</a>;
}
