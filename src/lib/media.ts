// Site photography configuration.
//
// No photographs ship with the repository: licensed imagery could not be
// sourced from the build environment, and we never want to imply that a
// stock photo shows a specific immigration office. To use photography:
//   1. Obtain an image you are licensed to use (e.g. commissioned, or a
//      licence that permits commercial use) of modern Seoul / South Korea.
//   2. Save an optimised 2400px-wide JPEG/WebP as public/images/hero.jpg.
//   3. Fill in `hero` below, including the credit — it is shown on the page.
// Until then the original SVG illustration (components/home/seoul-dusk.tsx) is used.

export type Photo = { src: string; width: number; height: number; credit: string; licence: string };

export const media: { hero: Photo | null } = {
  hero: null,
};
