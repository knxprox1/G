const ARTWORK_GLOB = import.meta.glob<string>('/src/assets/images/*.{webp,jpg,png}', {
  eager: true,
  import: 'default',
});

const ARTWORK_THUMB_GLOB = import.meta.glob<string>('/src/assets/images/thumbs/*.{webp,jpg,png}', {
  eager: true,
  import: 'default',
});

export type ArtworkVariant = 'full' | 'thumb';

/**
 * يحوّل مسار الصورة البرمجي (`/src/assets/images/...`) إلى رابط الحزمة النهائية بالحجم المناسب (كامل أو مصغّر).
 */
export function resolveArtworkSrc(src: string, variant: ArtworkVariant = 'full'): string {
  if (!src) return '';
  const normalized = src.startsWith('/') ? src : `/${src}`;
  if (variant === 'thumb') {
    const thumbPath = normalized.replace('/src/assets/images/', '/src/assets/images/thumbs/');
    if (ARTWORK_THUMB_GLOB[thumbPath]) {
      return ARTWORK_THUMB_GLOB[thumbPath];
    }
  }
  if (ARTWORK_GLOB[src]) {
    return ARTWORK_GLOB[src];
  }
  return ARTWORK_GLOB[normalized] ?? src;
}
