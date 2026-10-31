export type AgeGroup = 'child' | 'preteen' | 'teen' | 'adult20' | 'adult35' | 'adult40' | 'adult60';
export type CharacterGender = 'boy' | 'girl';
export type CharacterStyle = 'classic-boy' | 'classic-girl' | 'asian-boy' | 'asian-girl' | 'african-boy' | 'african-girl' | 'auburn-girl' | 'sandy-boy' | 'wheelchair-boy' | 'wheelchair-girl';
export const ageOptions: {id: AgeGroup; label: string}[] = [
  {id:'child',label:'5–10'},{id:'preteen',label:'11–12'},{id:'teen',label:'13–19'},
  {id:'adult20',label:'20–34'},{id:'adult35',label:'35–39'},{id:'adult40',label:'40–59'},{id:'adult60',label:'60+'}
];
export const characterStyles: {id: CharacterStyle; gender: CharacterGender; olderOnly?: boolean}[] = [
  {id:'classic-boy',gender:'boy'},{id:'classic-girl',gender:'girl'},
  {id:'asian-boy',gender:'boy',olderOnly:true},{id:'asian-girl',gender:'girl',olderOnly:true},
  {id:'african-boy',gender:'boy',olderOnly:true},{id:'african-girl',gender:'girl',olderOnly:true},
  {id:'auburn-girl',gender:'girl',olderOnly:true},{id:'sandy-boy',gender:'boy',olderOnly:true},
  {id:'wheelchair-boy',gender:'boy'},{id:'wheelchair-girl',gender:'girl'}
];
export function isAdultAge(age: AgeGroup) {return age.startsWith('adult');}
export function detailedPrompts(age: AgeGroup) {return age==='teen'||isAdultAge(age);}
export function stylesForAge(age: AgeGroup) {return characterStyles.filter(style=>isAdultAge(age)?!style.olderOnly:!style.olderOnly||age==='teen');}
export function normalizeAge(age: unknown): AgeGroup {return ageOptions.some(option=>option.id===age)?age as AgeGroup:'preteen';}
export function withCompanionAge<T extends {ageGroup: AgeGroup; style: CharacterStyle; gender: CharacterGender}>(profile: T, ageGroup: AgeGroup): T {
  const choices=stylesForAge(ageGroup);
  const style=choices.find(choice=>choice.id===profile.style)??choices.find(choice=>choice.gender===profile.gender)??choices[0];
  return {...profile,ageGroup,style:style.id,gender:style.gender};
}
export function companionAsset(profile: {ageGroup: AgeGroup; style: CharacterStyle; gender: CharacterGender; portrait?: 'original' | 'prepared'}): string {
  if(profile.portrait==='prepared'){const index=({'classic-boy':1,'classic-girl':2,'wheelchair-boy':3,'wheelchair-girl':4} as Partial<Record<CharacterStyle,number>>)[profile.style]??(profile.gender==='girl'?2:1);return `/assets/characters/${profile.ageGroup}-${index}-ready-clean.png`;} 
  if(isAdultAge(profile.ageGroup)) {
    const variants: Partial<Record<CharacterStyle,number>>={'classic-boy':1,'classic-girl':2,'wheelchair-boy':3,'wheelchair-girl':4};
    return `/assets/characters/${profile.ageGroup}-${variants[profile.style]??(profile.gender==='girl'?2:1)}-clean.png`;
  }
  if(profile.style.startsWith('wheelchair-'))return `/assets/characters/${profile.style}.png`;
  if(profile.style==='classic-boy'||profile.style==='classic-girl')return `/assets/characters/${profile.gender}-${profile.ageGroup}-clean.png`;
  return `/assets/characters/teen-${profile.style}-clean.png`;
}

export function looksForAge(age: AgeGroup) {
  const originals=stylesForAge(age).map(style=>({...style,portrait:'original' as const}));
  const prepared=stylesForAge(age).filter(style=>!style.olderOnly).map(style=>({...style,portrait:'prepared' as const}));
  return [...prepared,...originals];
}

/** Upgrade the previous default portrait choice once; later explicit choices are respected. */
export function refreshedPortrait(profile: {style?: CharacterStyle; portrait?: 'original'|'prepared'; portraitRevision?:number}): 'original'|'prepared' {
 if((profile.portraitRevision??0)>=1&&profile.portrait)return profile.portrait;
 return ['classic-boy','classic-girl','wheelchair-boy','wheelchair-girl'].includes(profile.style??'classic-boy')?'prepared':'original';
}
