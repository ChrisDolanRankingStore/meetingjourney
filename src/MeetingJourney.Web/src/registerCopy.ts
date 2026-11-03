import {t} from './i18n';
import type {AgeGroup} from './companions';

const standardCopy:Record<string,string>={
 'Welcome to your adventure':'This week',
 'Your adventure journal':'My notes',
 'Let us take the next step':'Ready when you are',
 'Your adventure · Week of ':'Week of '
};
export function registerText(value:string,age:AgeGroup){
 if(age==='child')return t(value);
 const direct=standardCopy[value];
 return t(direct??value.replace(/treasure chest/gi,'stamp'));
}
