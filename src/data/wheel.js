/**
 * ===== Рулетка звёзд =====
 *
 * ВАЖНО ДЛЯ БЭКЕНДА.
 * Фронт НЕ знает и не должен знать шансы выпадения. Он лишь вызывает spin()
 * и рисует то, что пришло. Вся вероятностная логика, счётчик гаранта и
 * начисление приза — на сервере.
 *
 * Контракт (то, что нужно отдать с сервера):
 *   POST /api/roulette/spin  →  {
 *     reel:      [Item, ...],   // лента для прокрутки, чисто визуальная
 *     winIndex:  number,        // индекс выигрышной карточки в reel
 *     prize:     Item,          // приз (== reel[winIndex])
 *     pity:      { current, target },  // прогресс до гаранта Луны
 *     nearMiss:  'left' | 'right' | null // светило рядом с призом (для накала)
 *   }
 *   GET /api/roulette/reel   →  [Item, ...]   // лента для покоя
 *   GET /api/me/stars        →  [Item, ...]   // выигранные звёзды
 *
 * Item = { cartId, rarity, tier, name, image, color, variant,
 *          face, decor, constellation | system, wonAt }
 *
 * Ниже — временная заглушка сервера. При подключении бэкенда заменяется
 * только этот файл, страницы трогать не нужно.
 */

import { RARITIES } from './rarities';

/* ===== Презентация: названия и цвета редкостей (нужны фронту для отрисовки) ===== */
export const WHEEL_TIERS = {
  crown: {
    id: 'crown',
    rarityId: 'crown',
    label: RARITIES.crown.label,
    color: '#ffcf6a',
  },
  guiding: {
    id: 'guiding',
    rarityId: 'guiding',
    label: RARITIES.guiding.label,
    color: '#b98bff',
  },
  constellation: {
    id: 'constellation',
    rarityId: 'constellation',
    label: RARITIES.constellation.label,
    color: '#5b8def',
  },
  distant: {
    id: 'distant',
    rarityId: 'distant',
    label: RARITIES.distant.label,
    color: '#54cfe0',
  },
};

export const WHEEL_TIER_ORDER = ['crown', 'guiding', 'constellation', 'distant'];

/* Сколько круток до гарантированной Луны (показываем игроку) */
export const PITY_TARGET = 100;

/* ===== Хранилище выигранных звёзд ===== */
const WINS_KEY = 'wonStars';

export const getWins = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(WINS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const recordWin = (prize) => {
  const wins = getWins();
  wins.unshift(prize);
  try {
    localStorage.setItem(WINS_KEY, JSON.stringify(wins));
  } catch {
    /* хранилище недоступно — приз не попадёт в историю */
  }
  return prize;
};

/* ==========================================================================
 * НИЖЕ — ЗАГЛУШКА СЕРВЕРА. На проде весь этот блок уезжает на бэкенд.
 * ========================================================================== */

/* Веса выпадения — серверная тайна, фронту не отдаются */
const DROP_WEIGHTS = { crown: 0.02, guiding: 0.12, constellation: 0.26, distant: 0.6 };

const PITY_KEY = 'roulettePity';

const WON_NAMES = [
  'Аэлла', 'Сельмира', 'Вельот', 'Орамэль', 'Тэядия', 'Аринэя', 'Нолия',
  'Стивия', 'Элирия', 'Каэра', 'Люна', 'Нэлла', 'Мивэль', 'Зонэя', 'Аридия',
  'Юнамия', 'Сельста', 'Ильсия', 'Ноот', 'Вельрия', 'Милия', 'Аэвия',
];

const TIER_TILES = {
  guiding: Array.from({ length: 10 }, (_, i) => `guiding-${i + 1}`),
  constellation: Array.from({ length: 28 }, (_, i) => `star-${i + 1}`),
  distant: Array.from({ length: 28 }, (_, i) => `star-${i + 1}`),
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const readPity = () => {
  const n = Number(localStorage.getItem(PITY_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const writePity = (n) => {
  try {
    localStorage.setItem(PITY_KEY, String(n));
  } catch {
    /* игнорируем */
  }
};

/* Сборка предмета нужного тира */
const makeItem = (tier, key, variant = null) => {
  const base = {
    cartId: `won-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rarity: WHEEL_TIERS[tier].rarityId,
    tier,
    face: 'joy',
    decor: 'sparkles',
    wonAt: new Date().toLocaleDateString('ru-RU'),
    key,
  };

  if (tier === 'crown') {
    const v = variant || (Math.random() < 0.5 ? 'sun' : 'moon');
    return {
      ...base,
      variant: v,
      name: v === 'sun' ? 'Солнце' : 'Луна',
      system: 'Солнечная система',
      color: v === 'sun' ? 'gold' : 'silver',
      image: v === 'sun' ? 'sun-1' : 'moon-1',
    };
  }

  return {
    ...base,
    variant: null,
    name: pick(WON_NAMES),
    constellation: 'Рулетка звёзд',
    color: tier === 'guiding' ? 'gold' : tier === 'constellation' ? 'blue' : 'cyan',
    image: pick(TIER_TILES[tier]),
  };
};

/* Розыгрыш тира по весам — только внутри «сервера» */
const rollTier = () => {
  const r = Math.random();
  let acc = 0;
  for (const tier of WHEEL_TIER_ORDER) {
    acc += DROP_WEIGHTS[tier];
    if (r < acc) return tier;
  }
  return 'distant';
};

const REEL_LEN = 60;
const WIN_INDEX = 52;

/* Сколько светил подмешать в ленту, чтобы игрок видел их на прокрутке */
const TEASE_COUNT = 5;

/**
 * Лента для прокрутки. Чисто визуальная: важен только winIndex.
 * Светила намеренно подмешиваются, чтобы пролетали перед глазами.
 */
const buildReel = (prize, nearMiss) => {
  const reel = Array.from({ length: REEL_LEN }, (_, i) =>
    makeItem(rollTier(), `i-${i}`)
  );

  /* показываем Солнце и Луну по ходу прокрутки */
  const teasePositions = new Set();
  while (teasePositions.size < TEASE_COUNT) {
    const p = 4 + Math.floor(Math.random() * (WIN_INDEX - 8));
    teasePositions.add(p);
  }
  let flip = 0;
  for (const p of teasePositions) {
    reel[p] = makeItem('crown', `i-${p}`, flip++ % 2 ? 'moon' : 'sun');
  }

  /* приз на своё место */
  reel[WIN_INDEX] = { ...prize, key: `w-${WIN_INDEX}` };

  /* «в миллиметрах»: светило вплотную к призу */
  if (nearMiss === 'left') {
    reel[WIN_INDEX - 1] = makeItem('crown', `i-${WIN_INDEX - 1}`);
  } else if (nearMiss === 'right') {
    reel[WIN_INDEX + 1] = makeItem('crown', `i-${WIN_INDEX + 1}`);
  }

  return reel;
};

/* Лента в состоянии покоя (до первой прокрутки) */
export const fetchReel = async () =>
  Array.from({ length: 24 }, (_, i) => makeItem(rollTier(), `s-${i}`));

/**
 * Прокрутка. Возвращает всё, что нужно фронту для отрисовки.
 * TODO(backend): заменить тело на fetch('/api/roulette/spin', { method: 'POST' }).
 */
export const spin = async () => {
  const spins = readPity() + 1;

  /* гарант: сотая крутка всегда даёт Луну */
  const guaranteed = spins >= PITY_TARGET;
  const tier = guaranteed ? 'crown' : rollTier();
  const prize = makeItem(tier, 'prize', guaranteed ? 'moon' : null);

  /* счётчик сбрасывается на гаранте и на любом выпавшем светиле */
  writePity(tier === 'crown' ? 0 : spins);

  /* иногда останавливаемся впритык к светилу — для накала */
  const nearMiss =
    tier === 'crown' ? null : Math.random() < 0.35 ? (Math.random() < 0.5 ? 'left' : 'right') : null;

  const reel = buildReel(prize, nearMiss);
  recordWin(prize);

  return {
    reel,
    winIndex: WIN_INDEX,
    prize,
    nearMiss,
    guaranteed,
    pity: { current: tier === 'crown' ? 0 : spins, target: PITY_TARGET },
  };
};

/* Текущий прогресс гаранта (для отображения до первой крутки) */
export const fetchPity = async () => ({ current: readPity(), target: PITY_TARGET });
