import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bibleReferenceLinks, jwLibraryHandoffUrl, jwLibraryUrl} from '../src/i18n.ts';
import {lookupSong} from '../src/songs.ts';

const codes = (reference,language='en') => bibleReferenceLinks(reference,language).map(link=>new URL(link.url).searchParams.get('bible'));

test('typed scriptures accept common abbreviations, compact spacing and dot separators',()=>{
  for(const input of ['Jn3.16','Jn 3:16','Jn. 3:16','John3:16','John 3:16','jn3.16.','JOHN 3 : 16']){
    assert.deepEqual(codes(input),['43003016'],input);
  }
  assert.deepEqual(codes('Remember Jn3.16 and Ps37.4.'),['43003016','19037004']);
  assert.deepEqual(codes('1Jn4.8; 2Cor8.2-4'),['62004008','47008002-47008004']);
  assert.deepEqual(codes('Jn3.36-4.2, 5'),['43003036-43004002','43004005']);
  assert.deepEqual(codes('Juan3.16; Sal.37:4; 1Co13.4','es'),['43003016','19037004','46013004']);
  assert.deepEqual(codes('Jn3.16 and John 3:16'),['43003016']);
  assert.deepEqual(codes('projectJn3.16; Jn0.1; Jn99.16; Jn3.0'),[]);
});

test('Spanish Philippians shorthand in notes links to the exact passage without matching inside words',()=>{
  for(const alias of ['fi','fili','fl']){
    for(const input of [`${alias} 4:6`,`${alias.toUpperCase()}.4.6`,`${alias}4:6`]){
      const links=bibleReferenceLinks(`Mi nota: ${input}`,'es');
      assert.equal(links.length,1,input);
      const url=new URL(links[0].url);
      assert.equal(url.searchParams.get('bible'),'50004006',input);
      assert.equal(url.searchParams.get('wtlocale'),'S',input);
    }
    assert.deepEqual(codes(`${alias} 4:6-7`,'es'),['50004006-50004007']);
  }
  assert.deepEqual(codes('Fi 4:6; Fili 4:6; Fl 4:6; Filipenses 4:6','es'),['50004006']);
  assert.deepEqual(codes('perfil 4:6; wifi 4:6; fili; fl 5:1','es'),[]);
});

test('English Ph shorthand resolves Philippians without changing Philemon references',()=>{
  for(const input of ['Ph 4:6','PH.4.6','ph4:6']){
    const links=bibleReferenceLinks(`My note: ${input}`,'en');
    assert.equal(links.length,1,input);
    const url=new URL(links[0].url);
    assert.equal(url.searchParams.get('bible'),'50004006',input);
    assert.equal(url.searchParams.get('wtlocale'),'E',input);
  }
  assert.deepEqual(codes('Ph 4:6-7; Phm 1:6; Philemon 1:7'),['50004006-50004007','57001006','57001007']);
  assert.deepEqual(codes('graph 4:6; Ph; Ph 5:1'),[]);
});

test('Bible links preserve single verses, ranges, separate verses and cross-chapter passages',()=>{
  assert.deepEqual(codes('John 3:16'),['43003016']);
  assert.deepEqual(codes('Jeremiah 45:3, 5'),['24045003','24045005']);
  assert.deepEqual(codes('John 3:16–18, 20; 4:1–3'),['43003016-43003018','43003020','43004001-43004003']);
  assert.deepEqual(codes('John 3:36–4:2'),['43003036-43004002']);
  assert.deepEqual(codes('Jeremiah 45–46'),['24045000','24046000']);
  assert.deepEqual(codes('Song of Solomon 2:1; 1 John 4:8'),['22002001','62004008']);
  assert.deepEqual(codes('Cantar de los cantares 2:1; 1 Juan 4:8','es'),['22002001','62004008']);
  assert.deepEqual(codes('Jeremías 45:3, 5; 2 Corintios 8:2–4','es'),['24045003','24045005','47008002-47008004']);
  assert.deepEqual(codes('Not a scripture; John 0:1; Jude 2:1; John 3:18–16; John 3:999'),[]);
});

test('direct Library URLs retain exact publication, paragraph, media and Bible targets',()=>{
  for(const query of ['docid=202026258&par=5','bible=43003016-43003018&pub=nwtsty','pub=ca-copgm27','lank=pub-jwb_202601_1_VIDEO']){
    const result=jwLibraryUrl(`https://www.jw.org/finder?${query}`,'es');
    assert.match(result,/^jwlibrary:\/\/\/finder\?/);
    const parsed=new URL(result);
    assert.equal(parsed.searchParams.get('wtlocale'),'S');
    for(const [key,value] of new URLSearchParams(query))assert.equal(parsed.searchParams.get(key),value);
    assert.equal(jwLibraryUrl(result,'es'),result);
  }
  assert.equal(new URL(jwLibraryUrl('https://wol.jw.org/en/wol/d/r1/lp-e/202026258#h=5','en')).searchParams.get('docid'),'202026258');
  assert.equal(new URL(jwLibraryUrl('https://www.jw.org/open?docid=202026258','en')).searchParams.get('wtlocale'),'E');
  for(const url of ['https://example.com/finder?docid=1','https://www.jw.org.evil.test/finder?docid=1','javascript:alert(1)','https://www.jw.org/en/library/','not a URL']){
    assert.equal(jwLibraryUrl(url),undefined);
  }
});

test('every bundled song has a verified app identifier and a separate official web page',()=>{
  for(const language of ['en','es']){
    for(let number=1;number<=164;number++){
      const song=lookupSong(number,language);
      assert.ok(song?.appUrl,`${language} song ${number}`);
      const app=new URL(jwLibraryUrl(song.appUrl,language));
      assert.match(app.searchParams.get('docid'),/^\d+$/);
      assert.equal(app.searchParams.get('wtlocale'),language==='es'?'S':'E');
      assert.equal(new URL(song.url).hostname,'www.jw.org');
    }
  }
});

test('one HTTPS handoff preserves exact targets for app links and browser fallback',()=>{
  for(const language of ['en','es']){
    for(const input of [
      'jwlibrary:///finder?bible=43003016-43003018&pub=nwtsty',
      'https://www.jw.org/open?docid=202026258&par=5#h=7',
      'https://wol.jw.org/en/wol/d/r1/lp-e/202026258#h=5',
      'https://www.jw.org/finder?pub=ca-copgm27',
      'https://www.jw.org/finder?lank=pub-jwb_202601_1_VIDEO'
    ]){
      const result=jwLibraryHandoffUrl(input,language);
      assert.match(result,/^https:\/\/www.jw.org\/finder\?/);
      assert.equal(result,jwLibraryUrl(input,language).replace('jwlibrary:///finder?','https://www.jw.org/finder?'));
      assert.equal(new URL(result).searchParams.get('wtlocale'),language==='es'?'S':'E');
    }
  }
  assert.equal(jwLibraryHandoffUrl('https://www.jw.org/en/library/','en'),'https://www.jw.org/en/library/');
  assert.equal(jwLibraryHandoffUrl(undefined),undefined);
});
