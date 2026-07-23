/**
 * ===== Колесо звёзд =====
 *
 * Раскладка колеса, тиры редкостей (адаптированы под редкости сайта),
 * логика розыгрыша и хранение выигранных звёзд.
 *
 * Ячейки — «посадочные места»: у каждой есть поле icon (ключ картинки).
 * Сейчас у Солнца/Луны стоят готовые тайлы, у остальных — null (рисуется
 * цветная заглушка). Позже сюда подставятся webp по созвездиям.
 *
 * TODO(backend): результат вращения должен приходить с сервера
 *                (честный рандом + защита), фронт только анимирует.
 */

import { RARITIES } from './rarities';

export const CELL_COUNT = 26;

/* ===== Тиры колеса → редкости сайта =====
   cells — сколько ячеек занимает тир, weight — шанс выпадения,
   цвета взяты «под сайт», но с яркой заливкой сегментов колеса. */
export const WHEEL_TIERS = {
  crown: {
    id: 'crown',
    rarityId: 'crown',
    label: RARITIES.crown.label,        // Небесный Венец
    cells: 2,
    weight: 0.03,
    color: '#ffe9a8',
    color2: '#e7a23e',
    glow: 'rgba(255, 223, 142, 0.7)',
  },
  guiding: {
    id: 'guiding',
    rarityId: 'guiding',
    label: RARITIES.guiding.label,      // Путеводная
    cells: 4,
    weight: 0.12,
    color: '#8a55c8',
    color2: '#5b3499',
    glow: 'rgba(160, 110, 230, 0.6)',
  },
  constellation: {
    id: 'constellation',
    rarityId: 'constellation',
    label: RARITIES.constellation.label, // Созвёздная
    cells: 8,
    weight: 0.25,
    color: '#3f66c4',
    color2: '#2c4a97',
    glow: 'rgba(80, 130, 230, 0.6)',
  },
  distant: {
    id: 'distant',
    rarityId: 'distant',
    label: RARITIES.distant.label,       // Далёкая
    cells: 12,
    weight: 0.60,
    color: '#37aecb',
    color2: '#2183a6',
    glow: 'rgba(84, 200, 224, 0.55)',
  },
};

/* Порядок для легенды — от самого редкого к частому */
export const WHEEL_TIER_ORDER = ['crown', 'guiding', 'constellation', 'distant'];

/**
 * Раскладка ячеек по кругу (индекс 0 — сверху, далее по часовой стрелке).
 * Солнце — сверху (0), Луна — снизу (25). Тиры распределены симметрично:
 * эпические у полюсов, редкие ближе к низу.
 */
const buildLayout = () => {
  const cells = new Array(CELL_COUNT);

  /* два легендарных светила на вертикали (Солнце сверху, Луна снизу) */
  cells[0] = { tier: 'crown', variant: 'sun', icon: 'sun-1' };
  cells[13] = { tier: 'crown', variant: 'moon', icon: 'moon-1' };

  /* правая половина: 1..12 (сверху вниз) */
  for (let i = 1; i <= 12; i++) {
    let tier;
    if (i <= 2) tier = 'guiding';
    else if (i <= 6) tier = 'constellation';
    else tier = 'distant';
    cells[i] = { tier, variant: null, icon: null };
  }

  /* левая половина: 14..25 (снизу вверх) — зеркально правой */
  for (let i = 14; i <= 25; i++) {
    let tier;
    if (i <= 19) tier = 'distant';
    else if (i <= 23) tier = 'constellation';
    else tier = 'guiding';
    cells[i] = { tier, variant: null, icon: null };
  }

  return cells.map((c, i) => ({
    index: i,
    ...c,
    rarityId: WHEEL_TIERS[c.tier].rarityId,
    angle: (i * 360) / CELL_COUNT, // центр ячейки, градусы по часовой от верха
  }));
};

export const WHEEL_CELLS = buildLayout();

/* ===== Розыгрыш ===== */

/* Имена для выигранных звёзд (кроме Солнца/Луны) */
const WON_NAMES = [
  'Аэлла', 'Сельмира', 'Вельот', 'Орамэль', 'Тэядия', 'Аринэя', 'Нолия',
  'Стивия', 'Элирия', 'Каэра', 'Люна', 'Нэлла', 'Мивэль', 'Зонэя', 'Аридия',
  'Юнамия', 'Сельста', 'Ильсия', 'Ноот', 'Вельрия', 'Милия', 'Аэвия',
];

/* Картинки-тайлы под тир (кроме Солнца/Луны — у них свои) */
const TIER_TILES = {
  guiding: Array.from({ length: 10 }, (_, i) => `guiding-${i + 1}`),
  constellation: Array.from({ length: 28 }, (_, i) => `star-${i + 1}`),
  distant: Array.from({ length: 28 }, (_, i) => `star-${i + 1}`),
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Выбор выигрышной ячейки: сначала тир по весам, затем случайная ячейка тира.
 * Возвращает объект ячейки из WHEEL_CELLS.
 */
export const rollWheel = () => {
  const r = Math.random();
  let acc = 0;
  let chosen = 'distant';
  for (const t of WHEEL_TIER_ORDER) {
    acc += WHEEL_TIERS[t].weight;
    if (r < acc) {
      chosen = t;
      break;
    }
  }
  const pool = WHEEL_CELLS.filter((c) => c.tier === chosen);
  return pick(pool);
};

/* Формирование приза (звезды) по выпавшей ячейке */
export const makePrize = (cell) => {
  const tier = WHEEL_TIERS[cell.tier];
  const base = {
    cartId: `won-${Date.now()}-${cell.index}`,
    rarity: tier.rarityId,
    tier: cell.tier,
    face: 'joy',
    decor: 'sparkles',
    wonAt: new Date().toLocaleDateString('ru-RU'),
  };

  if (cell.tier === 'crown') {
    return {
      ...base,
      variant: cell.variant,
      name: cell.variant === 'sun' ? 'Солнце' : 'Луна',
      system: 'Солнечная система',
      color: cell.variant === 'sun' ? 'gold' : 'silver',
      image: cell.icon,
    };
  }

  return {
    ...base,
    variant: null,
    name: pick(WON_NAMES),
    constellation: 'Колесо звёзд',
    color: tier.id === 'guiding' ? 'gold' : tier.id === 'constellation' ? 'blue' : 'cyan',
    image: pick(TIER_TILES[cell.tier]),
  };
};

/* ===== Хранение выигранных звёзд (мок) ===== */
const WINS_KEY = 'wonStars';

export const getWins = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(WINS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/* Записать выигрыш; попадёт в личный кабинет.
   TODO(backend): начисление приза на аккаунт делает сервер */
export const recordWin = (prize) => {
  const wins = getWins();
  wins.unshift(prize);
  try {
    localStorage.setItem(WINS_KEY, JSON.stringify(wins));
  } catch {
    /* хранилище недоступно — приз просто не сохранится в истории */
  }
  return prize;
};
