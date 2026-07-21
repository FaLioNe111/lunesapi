/**
 * Нарезка звёзд из референсных листов в отдельные webp с прозрачным фоном.
 *
 * Запуск: node scripts/slice-stars.mjs
 * Исходники (по одному листу на ранг):
 *   src/assets/солнцеилуна.png  → sun-1…10, moon-1…10
 *   src/assets/Путеводная.png   → guiding-1…10
 *   src/assets/Созвёздная.png   → star-1…28
 *   src/assets/Далекие.png      → distant-1…60
 *   src/assets/Безымянные.png   → nameless-1…100
 * Результат: src/assets/stars/*.webp (512×512, прозрачный фон)
 *
 * Звёзды находятся автоматически по связным областям на всём листе:
 * ручных сеток нет, поэтому поля листа не сбивают нарезку, а цифры
 * и подписи отбрасываются по форме (текст — широкий и низкий).
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ASSETS = path.resolve('src/assets');
const OUT = path.resolve('src/assets/stars');

const TILE = 512;          // размер готового тайла
const BIG_AREA = 12000;    // компонент крупнее — кандидат в «тело звезды»
const MERGE_DIST = 45;     // зазор, при котором крупные блобы считаются одной звездой
const AIR = 20;            // воздух вокруг звезды при обрезке

/* ===== Удаление тёмного фона листа ===== */
const removeDarkBackground = async (file) => {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  /* фон — самый тёмный из четырёх углов */
  const cornerAt = (x, y) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners = [
    cornerAt(0, 0),
    cornerAt(width - 1, 0),
    cornerAt(0, height - 1),
    cornerAt(width - 1, height - 1),
  ];
  const bg = [0, 1, 2].map((ch) => Math.min(...corners.map((c) => c[ch])));

  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, o = 0; i < data.length; i += channels, o += 4) {
    const r = Math.max(0, data[i] - bg[0]);
    const g = Math.max(0, data[i + 1] - bg[1]);
    const b = Math.max(0, data[i + 2] - bg[2]);
    const lum = Math.max(r, g, b);
    const alpha = Math.min(255, Math.round(lum * 1.3));
    if (alpha === 0) continue;
    const k = 255 / alpha;
    out[o] = Math.min(255, Math.round(r * k));
    out[o + 1] = Math.min(255, Math.round(g * k));
    out[o + 2] = Math.min(255, Math.round(b * k));
    out[o + 3] = alpha;
  }

  return { data: out, width, height };
};

/* ===== Удаление светлой «шашечки» (лист безымянных) =====
   Заливка фона от краёв по слабонасыщенным светлым пикселям:
   внутренние светлые участки звёзд при этом не задеваются. */
const removeCheckerBackground = async (file) => {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const isBgColor = (idx) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    return mx - mn < 34 && mx > 185; // светлое и почти серое
  };

  /* маска фона заливкой от всех краёв */
  const isBg = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    const p = y * width + x;
    if (!isBg[p] && isBgColor(p * channels)) {
      isBg[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const p = stack.pop();
    const y = (p / width) | 0;
    const x = p % width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }

  const out = Buffer.alloc(width * height * 4);
  for (let p = 0, o = 0; p < width * height; p++, o += 4) {
    if (isBg[p]) continue;
    const i = p * channels;
    out[o] = data[i];
    out[o + 1] = data[i + 1];
    out[o + 2] = data[i + 2];
    out[o + 3] = 255;
  }

  /* мягкий край: чуть притушить альфу на границе с фоном */
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (isBg[p]) continue;
      const nearBg =
        isBg[p - 1] || isBg[p + 1] || isBg[p - width] || isBg[p + width];
      if (nearBg) out[p * 4 + 3] = 160;
    }
  }

  return { data: out, width, height };
};

/* ===== Связные компоненты по альфе ===== */
const labelComponents = ({ data, width, height }, TH = 52) => {
  const labels = new Int32Array(width * height).fill(-1);
  const comps = [];
  const stack = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (labels[idx] !== -1 || data[idx * 4 + 3] <= TH) continue;

      const id = comps.length;
      const c = { id, area: 0, minX: x, maxX: x, minY: y, maxY: y };
      labels[idx] = id;
      stack.push(idx);
      while (stack.length) {
        const cur = stack.pop();
        const cy = (cur / width) | 0;
        const cx = cur % width;
        c.area++;
        if (cx < c.minX) c.minX = cx;
        if (cx > c.maxX) c.maxX = cx;
        if (cy < c.minY) c.minY = cy;
        if (cy > c.maxY) c.maxY = cy;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nidx = ny * width + nx;
            if (labels[nidx] === -1 && data[nidx * 4 + 3] > TH) {
              labels[nidx] = id;
              stack.push(nidx);
            }
          }
        }
      }
      comps.push(c);
    }
  }

  return { labels, comps };
};

const bboxW = (c) => c.maxX - c.minX + 1;
const bboxH = (c) => c.maxY - c.minY + 1;
/* зазор между прямоугольниками (0 — пересекаются) */
const bboxGap = (a, b) => {
  const dx = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));
  const dy = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY));
  return Math.max(dx, dy);
};
const bboxOverlapArea = (a, b) => {
  const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) + 1;
  const h = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) + 1;
  return w > 0 && h > 0 ? w * h : 0;
};

/**
 * Группирует компоненты в «звёзды»:
 * 1) крупные блобы, кроме текстовых по форме, сливаются по близости;
 * 2) мелочь (искры, кольца) прицепляется к группе по перекрытию рамок.
 */
const detectStars = (comps) => {
  const textLike = (c) => bboxW(c) > 2.5 * bboxH(c);
  const bigs = comps.filter((c) => c.area >= BIG_AREA && !textLike(c));
  const smalls = comps.filter((c) => c.area < BIG_AREA && c.area >= 24);

  /* слияние крупных блобов (union-find по близости рамок) */
  const parent = bigs.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < bigs.length; i++) {
    for (let j = i + 1; j < bigs.length; j++) {
      if (bboxGap(bigs[i], bigs[j]) < MERGE_DIST) {
        parent[find(i)] = find(j);
      }
    }
  }

  const groupsByRoot = new Map();
  bigs.forEach((c, i) => {
    const root = find(i);
    if (!groupsByRoot.has(root)) {
      groupsByRoot.set(root, {
        ids: new Set(),
        area: 0,
        minX: c.minX,
        maxX: c.maxX,
        minY: c.minY,
        maxY: c.maxY,
      });
    }
    const g = groupsByRoot.get(root);
    g.ids.add(c.id);
    g.area += c.area;
    g.minX = Math.min(g.minX, c.minX);
    g.maxX = Math.max(g.maxX, c.maxX);
    g.minY = Math.min(g.minY, c.minY);
    g.maxY = Math.max(g.maxY, c.maxY);
  });
  const groups = [...groupsByRoot.values()];

  /* прицепляем мелочь: искры внутри рамки звезды, кольца вокруг неё */
  for (let pass = 0; pass < 2; pass++) {
    for (const s of smalls) {
      if (textLike(s) && s.area > 1200) continue; // строки текста не цепляем
      const sArea = bboxW(s) * bboxH(s);
      for (const g of groups) {
        const gW = g.maxX - g.minX + 1;
        const gH = g.maxY - g.minY + 1;
        /* номер листа: небольшой компонент в левом верхнем углу рамки */
        if (
          s.area < 7000 &&
          s.maxY < g.minY + 0.24 * gH &&
          s.minX < g.minX + 0.28 * gW
        ) {
          continue;
        }
        const overlap = bboxOverlapArea(s, g);
        const gArea = gW * gH;
        if (overlap > 0.55 * sArea || overlap > 0.55 * gArea) {
          if (!g.ids.has(s.id)) {
            g.ids.add(s.id);
            g.minX = Math.min(g.minX, s.minX);
            g.maxX = Math.max(g.maxX, s.maxX);
            g.minY = Math.min(g.minY, s.minY);
            g.maxY = Math.max(g.maxY, s.maxY);
          }
          break;
        }
      }
    }
  }

  return groups;
};

/* Раскладывает группы в порядок чтения: ряды по вертикали, внутри — слева направо */
const readingOrder = (groups, cols) => {
  const sorted = [...groups].sort(
    (a, b) => (a.minY + a.maxY) / 2 - (b.minY + b.maxY) / 2
  );
  const rows = [];
  for (let i = 0; i < sorted.length; i += cols) {
    rows.push(
      sorted
        .slice(i, i + cols)
        .sort((a, b) => (a.minX + a.maxX) / 2 - (b.minX + b.maxX) / 2)
    );
  }
  return rows.flat();
};

/* Сохраняет группу в тайл: вырезает рамку, стирает чужие пиксели */
const exportGroup = async (cleaned, labels, group, name) => {
  const { data, width, height } = cleaned;
  const left = Math.max(0, group.minX - AIR);
  const top = Math.max(0, group.minY - AIR);
  const w = Math.min(width, group.maxX + AIR + 1) - left;
  const h = Math.min(height, group.maxY + AIR + 1) - top;

  /* мягкое затухание альфы у краёв кадра, чтобы широкое свечение
     не обрезалось видимым квадратом */
  const FEATHER = 18;

  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = (top + y) * width + (left + x);
      const id = labels[src];
      /* чужие компоненты (цифры, подписи, соседние звёзды) не копируем */
      if (id !== -1 && !group.ids.has(id)) continue;
      const si = src * 4;
      const di = (y * w + x) * 4;
      const edge = Math.min(x, w - 1 - x, y, h - 1 - y);
      const f = Math.min(1, edge / FEATHER);
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = Math.round(data[si + 3] * f);
    }
  }

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .resize(TILE, TILE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3',
    })
    .sharpen({ sigma: 1.1, m1: 0.6, m2: 0.4 })
    .webp({ quality: 90, alphaQuality: 92, effort: 6 })
    .toFile(path.join(OUT, `${name}.webp`));

  return `${name}.webp`;
};

/* Полный проход по листу: фон → компоненты → группы → тайлы */
const processSheet = async ({ file, dark, cols, expected, names }) => {
  const cleaned = dark
    ? await removeDarkBackground(file)
    : await removeCheckerBackground(file);
  const { labels, comps } = labelComponents(cleaned, dark ? 52 : 128);
  let groups = detectStars(comps);

  /* если нашлось больше ожидаемого — берём самые крупные */
  if (groups.length > expected) {
    groups = [...groups].sort((a, b) => b.area - a.area).slice(0, expected);
  }
  if (groups.length !== expected) {
    console.warn(`  ! ${path.basename(file)}: найдено ${groups.length}, ожидалось ${expected}`);
  }

  const ordered = readingOrder(groups, cols);
  const written = [];
  for (const [i, g] of ordered.entries()) {
    written.push(await exportGroup(cleaned, labels, g, names(i)));
  }
  console.log(`${path.basename(file)}: ${written.length} тайлов`);
  return written;
};

const run = async () => {
  await mkdir(OUT, { recursive: true });

  const written = [];

  /* Солнце и Луна: 4 ряда по 5 — первые 10 солнца, дальше луны */
  written.push(
    ...(await processSheet({
      file: path.join(ASSETS, 'солнцеилуна.png'),
      dark: true,
      cols: 5,
      expected: 20,
      names: (i) => (i < 10 ? `sun-${i + 1}` : `moon-${i - 9}`),
    }))
  );

  written.push(
    ...(await processSheet({
      file: path.join(ASSETS, 'Путеводная.png'),
      dark: true,
      cols: 5,
      expected: 10,
      names: (i) => `guiding-${i + 1}`,
    }))
  );

  written.push(
    ...(await processSheet({
      file: path.join(ASSETS, 'Созвёздная.png'),
      dark: true,
      cols: 7,
      expected: 28,
      names: (i) => `star-${i + 1}`,
    }))
  );

  written.push(
    ...(await processSheet({
      file: path.join(ASSETS, 'Далекие.png'),
      dark: true,
      cols: 10,
      expected: 60,
      names: (i) => `distant-${i + 1}`,
    }))
  );

  /* Безымянные: 10 рядов по 13 = 130, берём первые 100 */
  {
    const all = await processSheet({
      file: path.join(ASSETS, 'Безымянные.png'),
      dark: false,
      cols: 13,
      expected: 130,
      names: (i) => `nameless-${i + 1}`,
    });
    written.push(...all.slice(0, 100));
  }

  await writeFile(
    path.join(OUT, 'index.json'),
    JSON.stringify(written, null, 2),
    'utf8'
  );
  console.log(`готово: ${written.length} тайлов по ${TILE}×${TILE}`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
