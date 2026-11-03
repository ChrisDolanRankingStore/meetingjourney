// A deliberately bounded bilingual noun vocabulary, not copied passage text.
const vocabulary = {
 en: {
  maps:'Babylon Israel Zion Jerusalem Judah Egypt Moab Ammon Edom Assyria Damascus Jordan Lebanon wilderness land river sea mountain city village gate field',
  people:'Abraham Sarah Isaac Jacob Moses Aaron Miriam Joshua Ruth David Solomon Jeremiah Baruch Daniel Paul Peter John shepherd king soldier prophet priest woman man child son daughter',
  animals:'lion sheep lamb goat bull horse donkey camel bird eagle dove fish locust serpent dog',
  buildings:'temple house wall tower tent altar palace courtyard',
  objects:'arrow bow sword spear shield trap fire water stone silver gold cup bread grain oil tree vine branch basket scroll book hand arm eye',
  numbers:'one two three four five six seven eight nine ten twelve twenty thirty forty fifty hundred thousand'
 },
 es: {
  maps:'Babilonia Israel Sion Jerusalén Judá Egipto Moab Ammón Edom Asiria Damasco Jordán Líbano desierto tierra río mar montaña ciudad pueblo puerta campo',
  people:'Abrahán Sara Isaac Jacob Moisés Aarón Míriam Josué Rut David Salomón Jeremías Baruc Daniel Pablo Pedro Juan pastor rey soldado profeta sacerdote mujer hombre niño hijo hija',
  animals:'león oveja cordero cabra toro caballo burro camello pájaro águila paloma pez langosta serpiente perro',
  buildings:'templo casa muro torre tienda altar palacio patio',
  objects:'flecha arco espada lanza escudo trampa fuego agua piedra plata oro copa pan grano aceite árbol vid rama cesta rollo libro mano brazo ojo',
  numbers:'uno dos tres cuatro cinco seis siete ocho nueve diez doce veinte treinta cuarenta cincuenta cien mil'
 }
};
const familiar = new Set('jehovah jesus love faith hope prayer peace kindness joy bible family friends help listen forgive courage jehová jesús amor fe esperanza oración paz bondad alegría biblia familia amigos ayuda escuchar perdonar valor'.split(' '));
const normal = value => value.normalize('NFC').toLocaleLowerCase();
export function extractPassageWords(text, language) {
 const tokens=text.normalize('NFC').match(/[\p{L}]+|\d+/gu)??[], counts=new Map();
 const nouns=new Map();
 for(const [category,list] of Object.entries(vocabulary[language])){
  for(const word of list.split(' ')) {
   nouns.set(normal(word),{word,category});
   if(language==='en')nouns.set(normal(word)+'s',{word,category});
   else {nouns.set(normal(word)+'s',{word,category});nouns.set(normal(word)+'es',{word,category});}
  }
 }
 for(const token of tokens) {
  const key=normal(token), noun=nouns.get(key)??(/^\d{1,4}$/.test(token)?{word:token,category:'numbers'}:undefined);
  if(noun&&!familiar.has(key)) {
   const previous=counts.get(normal(noun.word));
   counts.set(normal(noun.word),{...noun,count:(previous?.count??0)+1});
  }
 }
 return [...counts.values()].sort((a,b)=>b.count-a.count||a.word.localeCompare(b.word,language)).slice(0,40);
}
export function passageText(html, label) {
 const chapter=label.match(/(\d+)\s*:/)?.[1];
 if(!chapter)return '';
 const ranges=label.slice(label.indexOf(':')+1).split(',').map(value=>value.trim().match(/^(\d+)(?:[-–](\d+))?$/)).filter(Boolean);
 const chunks=[...html.matchAll(/<span\b[^>]*id="v(\d+)-(\d+)-(\d+)-\d+"[^>]*>/g)];
 return chunks.filter(chunk=>chunk[2]===chapter&&ranges.some(range=>Number(chunk[3])>=Number(range[1])&&Number(chunk[3])<=Number(range[2]??range[1])))
  .map(chunk=>html.slice(chunk.index+chunk[0].length,chunks[chunks.indexOf(chunk)+1]?.index??html.indexOf('</article>',chunk.index))
   .replace(/<a\b[^>]*>[\s\S]*?<\/a>/g,'').replace(/<[^>]+>/g,' ').replace(/&[^;]+;/g,' ')).join(' ');
}
