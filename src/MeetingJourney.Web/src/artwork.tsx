import {PORTRAIT_REVISION} from './release';
const stem = (source: string) => source.split('/').pop()!.replace(/\.(png|webp|jpg)$/, '');
export const sceneImage = (source: string, width = 960, format = 'webp') => source.endsWith('.svg') ? source : `/assets/compact-v1/${stem(source)}-${width}.${format}`;
export const focusLandscape = sceneImage('/assets/journey-river-v1.png',480);
export const portraitImage = (source: string, height = 360) => `/assets/compact-v1/${stem(source)}-${height}.webp?v=${PORTRAIT_REVISION}`;
export function SceneImage({ source, alt, className }: { source: string; alt: string; className?: string }) {
  if (source.endsWith('.svg')) return <picture className={className}><img src={source} alt={alt} draggable={false} decoding="async" /></picture>;
  return <picture className={className}><source type="image/webp" srcSet={[480, 960, 1600].map(size => `${sceneImage(source, size)} ${size}w`).join(', ')} sizes="(max-width: 600px) 100vw, 70vw" /><img src={sceneImage(source, 960, 'jpg')} srcSet={[480, 960, 1600].map(size => `${sceneImage(source, size, 'jpg')} ${size}w`).join(', ')} sizes="(max-width: 600px) 100vw, 70vw" alt={alt} draggable={false} decoding="async" /></picture>;
}
