import { getImage } from 'astro:assets';
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
