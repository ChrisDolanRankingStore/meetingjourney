import {bibleReferenceLinks, getLanguage, jwLibraryHandoffUrl, jwLibraryUrl, t} from './i18n';

export function OfficialLinks({url, webUrl = url, appLabel = 'Open in JW Library', webLabel = 'Open on JW.org'}: {
  url?: string; webUrl?: string; appLabel?: string; webLabel?: string;
}) {
  const app = jwLibraryUrl(url);
  const href = jwLibraryHandoffUrl(app ?? webUrl ?? url);
  return <span className="official-link-pair">
    {href && <a href={href} target="_blank" rel="noreferrer">{t(app ? appLabel : webLabel)}<span aria-hidden="true"> ↗</span></a>}
  </span>;
}

export function BibleReferenceLinks({reference}: {reference?: string}) {
  const links = bibleReferenceLinks(reference, getLanguage());
  if (!links.length) return null;
  return <div className="bible-reference-links" aria-label={t('Open Bible passage in JW Library')}>
    {links.map(link => <span className="official-link-pair" key={link.url}>
      <a href={jwLibraryHandoffUrl(link.url)} target="_blank" rel="noreferrer" aria-label={t('Open {reference} in JW Library', {reference:link.label})}>{link.label}<span aria-hidden="true"> ↗</span></a>
    </span>)}
  </div>;
}
