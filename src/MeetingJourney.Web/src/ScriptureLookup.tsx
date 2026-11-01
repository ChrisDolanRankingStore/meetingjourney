import {bibleReferenceLinks, t} from './i18n';
import {BibleReferenceLinks} from './OfficialLinks';

export function ScriptureLookup({text}: {text: string}) {
  if (!bibleReferenceLinks(text).length) return null;
  return <section className="scripture-lookup" aria-label={t('Scriptures in your note')}>
    <p>{t('Open a scripture from your note in JW Library or on JW.org.')}</p>
    <BibleReferenceLinks reference={text}/>
  </section>;
}
