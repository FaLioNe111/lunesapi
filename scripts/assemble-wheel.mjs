/**
 * Сборка колеса из слоёв, экспортированных из фотошопа.
 *
 * Слои обрезаны по содержимому, позиции потеряны. Скрипт их восстанавливает
 * геометрически и точно: у каждого сегмента две прямые боковые грани сходятся
 * ровно в центре колеса. Значит, если подогнать по этим граням две прямые и
 * пересечь их, получим центр колеса в координатах обрезанного слоя — а дальше
 * достаточно совместить его с центром рамы. Никаких прикидок по радиусу.
 *
 * Запуск: node scripts/assemble-wheel.mjs
 */

import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'C:/Users/Станислав/Downloads/Telegram Desktop/колесо';
const OUT = path.resolve('src/assets/wheel');
const FRAME = 'IMG_5580.png';
const POINTER = 'Слой 25.png';

const loadRaw = async (file) => {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, ch: info.channels };
};

/* Радиусы ступицы и обода — по лучу между спицами */
const measureFrame = async (file) => {
  const { data, w, h, ch } = await loadRaw(file);
  const cx = w / 2;
  const cy = h / 2;
  const A = (x, y) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) return 0;
    return data[(yi * w + xi) * ch + 3];
  };
  const hubs = [];
  const rims = [];
  for (const deg of [40, 50, 130, 140, 220, 230, 310, 320]) {
    const a = ((deg - 90) * Math.PI) / 180;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let hub = null;
    let rim = null;
    let was = A(cx, cy) > 40;
    for (let r = 2; r < w / 2; r++) {
      const op = A(cx + dx * r, cy + dy * r) > 40;
      if (was && !op && hub === null) hub = r;
      if (!was && op && hub !== null && rim === null) rim = r;
      was = op;
    }
    if (hub && rim) {
      hubs.push(hub);
      rims.push(rim);
    }
  }
  const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  return { data, w, h, ch, cx, cy, rHub: med(hubs), rRim: med(rims) };
};

/* наименьшие квадраты: y = a*x + b */
const fitLine = (pts) => {
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0);
  const sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const d = n * sxx - sx * sx;
  const a = (n * sxy - sx * sy) / d;
  const b = (sy - a * sx) / n;
  return { a, b };
};

/**
 * Анализ сегмента: центр колеса (через пересечение боковых граней),
 * угол сегмента и средний цвет.
 */
const analyseSegment = async (file) => {
  const { data, w, h, ch } = await loadRaw(file);

  const pts = [];
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      if (data[i + 3] > 140) {
        pts.push([x, y]);
        sr += data[i];
        sg += data[i + 1];
        sb += data[i + 2];
        n++;
      }
    }
  }
  if (pts.length < 50) throw new Error('пустой слой: ' + file);

  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;

  /* PCA — главная ось идёт вдоль радиуса */
  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (const [x, y] of pts) {
    const dx = x - mx;
    const dy = y - my;
    cxx += dx * dx;
    cyy += dy * dy;
    cxy += dx * dy;
  }
  cxx /= pts.length;
  cyy /= pts.length;
  cxy /= pts.length;
  const tr = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const l1 = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  let ux = cxy;
  let uy = l1 - cxx;
  if (Math.abs(cxy) < 1e-9) {
    ux = cxx >= cyy ? 1 : 0;
    uy = cxx >= cyy ? 0 : 1;
  }
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  const vx = -uy;
  const vy = ux;

  const proj = pts.map(([x, y]) => {
    const dx = x - mx;
    const dy = y - my;
    return { t: dx * ux + dy * uy, s: dx * vx + dy * vy };
  });
  const ts = proj.map((p) => p.t);
  const tmin = Math.min(...ts);
  const tmax = Math.max(...ts);
  const span = tmax - tmin;

  /* ширина на концах: узкий конец — внутренний (у ступицы) */
  const bandW = (lo, hi) => {
    const sel = proj.filter((p) => p.t >= lo && p.t <= hi).map((p) => p.s);
    if (sel.length < 4) return Infinity;
    return Math.max(...sel) - Math.min(...sel);
  };
  const innerAtLow = bandW(tmin, tmin + span * 0.15) < bandW(tmax - span * 0.15, tmax);
  const dirX = innerAtLow ? ux : -ux;
  const dirY = innerAtLow ? uy : -uy;

  /* по срезам вдоль радиуса берём крайние точки — это боковые грани */
  const BINS = 60;
  const lo = tmin + span * 0.1;
  const hi = tmax - span * 0.1;
  const step = (hi - lo) / BINS;
  const edgeMin = [];
  const edgeMax = [];
  for (let i = 0; i < BINS; i++) {
    const a = lo + i * step;
    const b = a + step;
    const sel = proj.filter((p) => p.t >= a && p.t < b).map((p) => p.s);
    if (sel.length < 3) continue;
    const t = a + step / 2;
    edgeMin.push([t, Math.min(...sel)]);
    edgeMax.push([t, Math.max(...sel)]);
  }

  /* пересечение граней = вершина сектора = центр колеса */
  const l1f = fitLine(edgeMin);
  const l2f = fitLine(edgeMax);
  const tApex = (l2f.b - l1f.b) / (l1f.a - l2f.a);
  const sApex = l1f.a * tApex + l1f.b;

  const centerX = mx + tApex * ux + sApex * vx;
  const centerY = my + tApex * uy + sApex * vy;

  /* центр тяжести внешней кромки — надёжный ориентир для посадки:
     измеряется устойчиво, в отличие от вершины сектора */
  const outerBand = innerAtLow
    ? proj.filter((p) => p.t >= tmax - span * 0.04)
    : proj.filter((p) => p.t <= tmin + span * 0.04);
  const obT = outerBand.reduce((q, p) => q + p.t, 0) / outerBand.length;
  const obS = outerBand.reduce((q, p) => q + p.s, 0) / outerBand.length;
  const outerX = mx + obT * ux + obS * vx;
  const outerY = my + obT * uy + obS * vy;

  /* радиусы внутренней и внешней дуги относительно найденного центра */
  const rIn = Math.abs(tmin - tApex);
  const rOut = Math.abs(tmax - tApex);

  let angle = (Math.atan2(dirX, -dirY) * 180) / Math.PI;
  if (angle < 0) angle += 360;

  return {
    file,
    w,
    h,
    angle,
    center: [centerX, centerY],
    outer: [outerX, outerY],
    segLen: span,
    rIn: Math.min(rIn, rOut),
    rOut: Math.max(rIn, rOut),
    color: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)],
  };
};

const classify = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = 60 * (((g - b) / d) % 6);
    else if (max === g) hue = 60 * ((b - r) / d + 2);
    else hue = 60 * ((r - g) / d + 4);
  }
  if (hue < 0) hue += 360;
  if (hue >= 255) return 'guiding';
  if (hue >= 210) return 'constellation';
  return 'distant';
};

const run = async () => {
  mkdirSync(OUT, { recursive: true });

  const frame = await measureFrame(path.join(SRC, FRAME));
  console.log(`рама ${frame.w}x${frame.h}: ступица r=${frame.rHub}, обод r=${frame.rRim}`);

  const files = readdirSync(SRC).filter((f) => f.startsWith('Слой') && f !== POINTER);
  const segs = [];
  for (const f of files) segs.push(await analyseSegment(path.join(SRC, f)));
  segs.sort((a, b) => a.angle - b.angle);

  console.log('\nсегмент          угол   r_вн  r_нар  редкость');
  for (const s of segs) {
    console.log(
      path.basename(s.file).padEnd(15),
      s.angle.toFixed(1).padStart(5) + '°',
      s.rIn.toFixed(0).padStart(5),
      s.rOut.toFixed(0).padStart(6),
      ' ' + classify(s.color)
    );
  }

  /* Радиус внутренней дуги общий для всех сегментов — берём медиану оценок:
     пересечение граней при растворе 15° неустойчиво, медиана его стабилизирует */
  const rInMed = [...segs].map((s) => s.rIn).sort((a, b) => a - b)[Math.floor(segs.length / 2)];
  console.log(`\nвнутренний радиус кольца (медиана): ${rInMed.toFixed(0)}`);

  const size = frame.w;

  /* Внешнюю кромку сегмента сажаем ровно на внутренний край обода:
     тогда снизу её перекрывает ступица, сверху — обод, щелей не остаётся. */
  const layers = segs.map((s) => {
    const a = ((s.angle - 90) * Math.PI) / 180;
    const rTarget = frame.rRim - s.segLen * 0.02; // поправка на ширину замерочной полосы
    const tx = frame.cx + Math.cos(a) * rTarget;
    const ty = frame.cy + Math.sin(a) * rTarget;
    return {
      input: s.file,
      left: Math.round(tx - s.outer[0]),
      top: Math.round(ty - s.outer[1]),
    };
  });

  const bad = layers.filter((l) => l.left < 0 || l.top < 0);
  if (bad.length) console.warn('внимание: смещение за холст у', bad.length, 'слоёв');

  const rawRing = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(layers)
    .png()
    .toBuffer();

  /* Между слоями остаются волосяные швы (следы обрезки в фотошопе).
     Подкладываем размытую копию — цвет затекает в шов, — а сверху
     возвращаем резкий оригинал, чтобы рисунок не замылился. */
  const underlay = await sharp(rawRing).blur(5).png().toBuffer();
  const ringBuf = await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: underlay }, { input: underlay }, { input: rawRing }])
    .png()
    .toBuffer();

  await sharp(ringBuf).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(OUT, 'segments.webp'));

  /* контроль: сколько прозрачных дыр осталось в кольце после наложения рамы */
  const { data: ring, info } = await sharp(ringBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rc = info.channels;
  let holes = 0;
  let total = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - frame.cx;
      const dy = y - frame.cy;
      const r = Math.hypot(dx, dy);
      if (r < frame.rHub + 6 || r > frame.rRim - 6) continue;
      total++;
      const i = (y * size + x) * rc;
      const j = (y * size + x) * frame.ch;
      if (ring[i + 3] < 40 && frame.data[j + 3] < 40) holes++;
    }
  }
  console.log(`\nкольцо собрано → segments.webp`);
  console.log(`незакрытых пикселей в кольце: ${holes} из ${total} (${((holes / total) * 100).toFixed(2)}%)`);

  /* карта ячеек */
  const CELLS = 24;
  const STEP = 360 / CELLS;
  const map = new Array(CELLS).fill(null);
  map[0] = { tier: 'crown', variant: 'sun' };
  map[12] = { tier: 'crown', variant: 'moon' };
  for (const s of segs) {
    map[Math.round(s.angle / STEP) % CELLS] = { tier: classify(s.color), angle: +s.angle.toFixed(1) };
  }
  writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify(map, null, 2), 'utf8');
  console.log('раскладка:', map.map((c) => c.tier).join(', '));

  /* рама и указатель */
  await sharp(path.join(SRC, FRAME)).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(OUT, 'frame.webp'));
  await sharp(path.join(SRC, POINTER)).trim().webp({ quality: 95, alphaQuality: 100, effort: 6 }).toFile(path.join(OUT, 'pointer.webp'));
  console.log('рама и указатель обновлены');
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
