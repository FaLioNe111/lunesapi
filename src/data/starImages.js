/**
 * ===== Картинки звёзд =====
 *
 * Тайлы нарезаны из референсных листов скриптом scripts/slice-stars.mjs
 * (512×512 webp с прозрачным фоном) и лежат в src/assets/stars/.
 *
 * Ключ картинки — имя файла без расширения: sun-1…sun-10, moon-1…moon-10,
 * guiding-1…guiding-10, star-1…star-28.
 */

/* Vite собирает все тайлы в карту «ключ → url» на этапе сборки */
const modules = import.meta.glob('../assets/stars/*.webp', {
  eager: true,
  import: 'default',
});

export const STAR_IMAGES = Object.fromEntries(
  Object.entries(modules).map(([file, url]) => [
    file.match(/([^/]+)\.webp$/)[1],
    url,
  ])
);

/* URL картинки по ключу; null — картинки нет (рисуем SVG-запаску) */
export const starImage = (key) => (key && STAR_IMAGES[key]) || null;
