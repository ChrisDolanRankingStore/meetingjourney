import type {ButtonHTMLAttributes, AnchorHTMLAttributes} from 'react';
import {NotebookIcon, type NotebookIconName} from './NotebookIcon';

export function IconAction({icon, label, showLabel = false, className = '', ...props}: {icon: NotebookIconName; label: string; showLabel?: boolean} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type="button" className={`icon-action ${className}`} aria-label={label} title={label}><NotebookIcon name={icon} />{showLabel&&<span className="icon-action-label">{label}</span>}</button>;
}
export function IconLink({icon, label, className = '', ...props}: {icon: NotebookIconName; label: string} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={`icon-action ${className}`} aria-label={label} title={label}><NotebookIcon name={icon} /></a>;
}
