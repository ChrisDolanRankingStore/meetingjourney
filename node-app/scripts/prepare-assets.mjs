import { createRequire } from 'node:module';
import { readdirSync, mkdirSync, writeFileSync, statSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
const web = resolve(fileURLToPath(new URL('../../src/MeetingJourney.Web', import.meta.url)));
const sharp = createRequire(join(web, 'package.json'))('sharp');
const assets = join(web, 'public/assets');
const output = join(assets, 'compact-v1');
mkdirSync(output, { recursive: true });
const scenes = readdirSync(assets).filter(name => name.endsWith('.png'));
let before = 0, after = 0;
for (const name of scenes) {
  const input = join(assets, name); before += statSync(input).size;
  for (const width of [480, 960, 1600]) {
    const pipeline = sharp(input).resize({ width, withoutEnlargement: true });
    const stem = name.replace('.png', `-${width}`);
    const result = await pipeline.clone().webp({ quality: 76, effort: 6 }).toFile(join(output, `${stem}.webp`));
    await pipeline.jpeg({ quality: 76, progressive: true, mozjpeg: true }).toFile(join(output, `${stem}.jpg`));
    if (width === 960) after += result.size;
  }
}
const characters = readdirSync(join(assets, 'characters')).filter(name => /(?:-clean|wheelchair-(?:boy|girl))\.png$/.test(name));
for (const name of characters) {
  for (const height of [180, 360, 720]) {
    await sharp(join(assets, 'characters', name)).resize({ height, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 95, effort: 6 }).toFile(join(output, `${name.replace('.png', '')}-${height}.webp`));
  }
}
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="512" height="512"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#9b5ea0"/><stop offset="1" stop-color="#d79560"/></linearGradient></defs><rect width="48" height="48" rx="11" fill="url(#bg)"/><path d="M10 33C14 25 18 25 21 29C25 34 28 32 31 25C34 18 37 16 40 18" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="10" cy="33" r="4" fill="#fff"/><path d="M36 9L32 19H39L33 30" fill="none" stroke="#ffd978" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="40" cy="18" r="4" fill="#ffd978"/></svg>`;
for (const size of [180, 192, 512]) await sharp(Buffer.from(icon)).resize(size).png().toFile(join(web, `public/icon-${size}.png`));
for (const size of [180,192,512]) copyFileSync(join(web, `public/icon-${size}.png`), join(web, `public/journey-route-${size}.png`));
for (const name of ['apple-touch-icon.png','apple-touch-icon-precomposed.png']) copyFileSync(join(web,'public/icon-180.png'),join(web,'public',name));
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fbf7ed"/><rect x="85" y="90" width="135" height="135" rx="30" fill="#35456b"/><path d="M153 114Q160 151 197 158Q160 165 153 202Q146 165 109 158Q146 151 153 114" fill="#fff8e6"/><text x="85" y="340" font-family="sans-serif" font-size="82" font-weight="bold" fill="#293854">Meeting Journey</text><text x="85" y="425" font-family="sans-serif" font-size="36" fill="#425575">Follow along. Notice something. Keep it.</text><text x="85" y="535" font-family="sans-serif" font-size="27" fill="#425575">Your notes and drawings stay on your device.</text></svg>`;
await sharp(Buffer.from(social)).png().toFile(join(web, 'public/social-card.png'));
writeFileSync(join(web, 'public/asset-budget.json'), JSON.stringify({ sceneOriginalBytes: before, scene960WebpBytes: after, savingPercent: Math.round((1 - after / before) * 100), sceneCount: scenes.length, characterCount: characters.length }, null, 2));
console.log(`Optimised ${scenes.length} scenes and ${characters.length} portraits; 960px scenes ${Math.round(after / 1024)} KB total (${Math.round((1 - after / before) * 100)}% smaller).`);
