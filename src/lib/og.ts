import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import photo from '../assets/bruno-anhezini.jpg';

let cached: Promise<{ src: string; width: number; height: number }> | undefined;

/** Optimized ~1200px JPEG of the profile photo, used as og:image on every page. */
export function getOgImage() {
  cached ??= getImage({ src: photo, width: 1200, height: 1200, format: 'jpeg', quality: 72 }).then((img) => ({
    src: img.src,
    width: Number(img.attributes.width ?? 1200),
    height: Number(img.attributes.height ?? 1200),
  }));
  return cached;
}

/** A page-specific share image, re-encoded as a 1200×630 JPEG. */
export async function getPageOgImage(src: ImageMetadata) {
  const img = await getImage({ src, width: 1200, height: 630, format: 'jpeg', quality: 80 });
  return {
    src: img.src,
    width: Number(img.attributes.width ?? 1200),
    height: Number(img.attributes.height ?? 630),
  };
}
