import type {Language} from './i18n.ts';
export type MeetingLanguageScope = {id: string; kind?: 'midweek' | 'weekend' | 'assembly' | 'convention'};
type Preferences = {meetings: Record<string, Language>; defaults: Partial<Record<NonNullable<MeetingLanguageScope['kind']>, Language>>};
type Reader = Pick<Storage,'getItem'>;
function preferences(storage: Reader): Preferences {
  const result: Preferences = {meetings: Object.create(null), defaults: {}};
  try {
    const value=JSON.parse(storage.getItem('mj-meeting-languages')??'{}');
    if(value?.meetings&&typeof value.meetings==='object'&&!Array.isArray(value.meetings))for(const [id,language]of Object.entries(value.meetings)){
      if(/^[\w-]{1,100}$/.test(id)&&(language==='en'||language==='es'))result.meetings[id]=language;
    }
    for(const kind of ['midweek','weekend','assembly','convention'] as const)if(value?.defaults?.[kind]==='en'||value?.defaults?.[kind]==='es')result.defaults[kind]=value.defaults[kind];
  }catch{}
  return result;
}
export function meetingLanguage(scope: MeetingLanguageScope, storage: Reader, fallback: Language): Language {
  const saved=preferences(storage);
  return saved.meetings[scope.id] ?? (scope.kind ? saved.defaults[scope.kind] : undefined) ?? fallback;
}
export function saveMeetingLanguage(scope: MeetingLanguageScope, language: Language, storage: Reader & Pick<Storage,'setItem'>) {
  const saved=preferences(storage);saved.meetings[scope.id]=language;
  if(scope.kind)saved.defaults[scope.kind]=language;
  storage.setItem('mj-meeting-languages',JSON.stringify(saved));
}
