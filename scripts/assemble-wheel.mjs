/**
 * Сборка колеса из слоёв, экспортированных из фотошопа.
 *
 * Слои обрезаны по содержимому, позиции потеряны. Скрипт восстанавливает их:
 *  - по форме сегмента (PCA) находит радиальное направление и внутренний край;
 *  - ставит сегмент на нужный угол и радиус кольца;
 *  - классифицирует редкость по среднему цвету (фиолетовый/синий/голубой).
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

const ALPHA_TH = 40;

/* ---- утилиты ---- */
const loadRaw = async (file) => {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, ch: info.channels };
};

/* Радиусы кольца по раме: луч между спицами — прозрачный от ступицы до обода */
const measureFrame = async (file) => {
  const { data, w, h, ch } = await loadRaw(file);
  const cx = w / 2;
  const cy = h / 2;
  const alphaAt = (x, y) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) return 0;
    return data[(yi * w + xi) * ch + 3];
  };

  /* пробуем несколько лучей и берём медиану — чтобы не попасть на спицу */
  const hubs = [];
  const rims = [];
  for (const deg of [40, 50, 130, 140, 220, 230, 310, 320]) {
    const a = ((deg - 90) * Math.PI) / 180;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let hub = null;
    let rim = null;
    let wasOpaque = alphaAt(cx, cy) > ALPHA_TH;
    for (let r = 2; r < w / 2; r += 1) {
      const op = alphaAt(cx + dx * r, cy + dy * r) > ALPHA_TH;
      if (wasOpaque && !op && hub === null) hub = r;         // конец ступицы
      if (!wasOpaque && op && hub !== null && rim === null) rim = r; // начало обода
      wasOpaque = op;
    }
    if (hub && rim) {
      hubs.push(hub);
      rims.push(rim);
    }
  }
  const med = (arr) => arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  return { w, h, cx, cy, rHub: med(hubs), rRim: med(rims) };
};

/* Анализ сегмента: угол, внутренняя точка, средний цвет */
const analyseSegment = async (file) => {
  const { data, w, h, ch } = await loadRaw(file);
  const pts = [];
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let n = 0;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = (y * w + x) * ch;
      if (data[i + 3] > 120) {
        pts.push([x, y]);
        sr += data[i];
        sg += data[i + 1];
        sb += data[i + 2];
        n++;
      }
    }
  }
  if (!pts.length) throw new Error('пустой слой: ' + file);

  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;

  /* PCA: главная ось = радиальное направление */
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
  if (Math.abs(cxy) < 1e-6) {
    ux = cxx >= cyy ? 1 : 0;
    uy = cxx >= cyy ? 0 : 1;
  }
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  const vx = -uy;
  const vy = ux;

  /* проекции на главную и поперечную оси */
  const proj = pts.map(([x, y]) => {
    const dx = x - mx;
    const dy = y - my;
    return { t: dx * ux + dy * uy, s: dx * vx + dy * vy, x, y };
  });
  const ts = proj.map((p) => p.t);
  const tmin = Math.min(...ts);
  const tmax = Math.max(...ts);
  const span = tmax - tmin;

  const bandWidth = (lo, hi) => {
    const sel = proj.filter((p) => p.t >= lo && p.t <= hi).map((p) => p.s);
    if (sel.length < 4) return Infinity;
    return Math.max(...sel) - Math.min(...sel);
  };
  const wLow = bandWidth(tmin, tmin + span * 0.15);
  const wHigh = bandWidth(tmax - span * 0.15, tmax);

  /* узкий конец — внутренний (у ступицы) */
  const innerAtLow = wLow < wHigh;
  const dirX = innerAtLow ? ux : -ux;
  const dirY = innerAtLow ? uy : -uy;

  const innerBand = innerAtLow
    ? proj.filter((p) => p.t <= tmin + span * 0.08)
    : proj.filter((p) => p.t >= tmax - span * 0.08);
  const ix = innerBand.reduce((s, p) => s + p.x, 0) / innerBand.length;
  const iy = innerBand.reduce((s, p) => s + p.y, 0) / innerBand.length;

  /* угол по часовой стрелке от верха */
  let angle = (Math.atan2(dirX, -dirY) * 180) / Math.PI;
  if (angle < 0) angle += 360;

  return {
    file,
    w,
    h,
    angle,
    inner: [ix, iy],
    length: span,
    color: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)],
  };
};

/* классификация редкости по среднему цвету */
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
  if (hue >= 255) return 'guiding';        // фиолетовый
  if (hue >= 210) return 'constellation';  // синий
  return 'distant';                        // голубой
};

const run = async () => {
  mkdirSync(OUT, { recursive: true });

  const frame = await measureFrame(path.join(SRC, FRAME));
  console.log('рама:', frame.w + 'x' + frame.h, 'ступица r=' + frame.rHub, 'обод r=' + frame.rRim);

  const files = readdirSync(SRC).filter(
    (f) => f.startsWith('Слой') && f !== POINTER
  );

  const segs = [];
  for (const f of files) {
    segs.push(await analyseSegment(path.join(SRC, f)));
  }
  segs.sort((a, b) => a.angle - b.angle);

  console.log('\nсегменты (угол → редкость):');
  for (const s of segs) {
    console.log(
      path.basename(s.file).padEnd(14),
      s.angle.toFixed(1).padStart(6) + '°',
      'len=' + s.length.toFixed(0).padStart(4),
      'rgb(' + s.color.join(',') + ')',
      classify(s.color)
    );
  }

  /* ---- сборка кольца ---- */
  const size = frame.w;
  const layers = [];
  for (const s of segs) {
    const a = ((s.angle - 90) * Math.PI) / 180;
    const targetX = frame.cx + Math.cos(a) * frame.rHub;
    const targetY = frame.cy + Math.sin(a) * frame.rHub;
    const left = Math.round(targetX - s.inner[0]);
    const top = Math.round(targetY - s.inner[1]);
    layers.push({ input: s.file, left, top });
  }

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .png()
    .toFile(path.join(OUT, 'segments.png'));

  console.log('\nкольцо собрано → src/assets/wheel/segments.png');

  /* карта ячеек: 24 позиции по 15°, 0 — Солнце, 12 — Луна */
  const CELLS = 24;
  const STEP = 360 / CELLS;
  const map = new Array(CELLS).fill(null);
  map[0] = { tier: 'crown', variant: 'sun' };
  map[12] = { tier: 'crown', variant: 'moon' };
  for (const s of segs) {
    const idx = Math.round(s.angle / STEP) % CELLS;
    map[idx] = { tier: classify(s.color), angle: +s.angle.toFixed(1) };
  }
  writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify(map, null, 2), 'utf8');

  const counts = map.reduce((acc, c) => {
    acc[c ? c.tier : 'EMPTY'] = (acc[c ? c.tier : 'EMPTY'] || 0) + 1;
    return acc;
  }, {});
  console.log('ячейки по редкости:', counts);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
