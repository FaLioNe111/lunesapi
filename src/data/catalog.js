/**
 * ===== Каталог звёзд (мок-API) =====
 *
 * Единственное место, которое нужно заменить при подключении бэкенда:
 * fetchCatalog() должен превратиться в запрос к серверу — форма данных
 * останется той же (секции по редкости со списками звёзд).
 *
 * TODO(backend): export const fetchCatalog = () =>
 *                  fetch('/api/catalog').then((r) => r.json());
 *
 * Пока каталог генерируется детерминированно на фронте:
 * при любой перерисовке и перезагрузке звёзды одни и те же.
 */

import { RARITIES, rollPrice } from './rarities';

/* ===== Детерминированный генератор ===== */
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

/* ===== Словари генерации ===== */
const NAME_START = [
  'Лю', 'Аэ', 'Сти', 'Ми', 'Но', 'Вель', 'Эли', 'Ора',
  'Юна', 'Кае', 'Сель', 'Тэя', 'Ари', 'Зо', 'Иль', 'Нэ',
];
const NAME_END = [
  'мия', 'лла', 'рия', 'нэя', 'лия', 'ста', 'вия', 'ра',
  'на', 'мэль', 'сия', 'от', 'дия', 'вэль', 'мира', 'тис',
];

/* 28 созвездий — по одному на каждую созвёздную звезду */
const CONSTELLATIONS = [
  'Лебедь', 'Лира', 'Орион', 'Кассиопея', 'Андромеда', 'Персей', 'Большая Медведица',
  'Малая Медведица', 'Дракон', 'Волопас', 'Близнецы', 'Телец', 'Дева', 'Лев',
  'Рыбы', 'Водолей', 'Стрелец', 'Скорпион', 'Овен', 'Весы', 'Пегас', 'Феникс',
  'Журавль', 'Голубь', 'Единорог', 'Северная Корона', 'Южный Крест', 'Кит',
];

const DESCRIPTIONS = [
  'мерцает тёплым золотом',
  'просыпается только к полуночи',
  'любит, когда на неё смотрят вдвоём',
  'самая тихая в своём созвездии',
  'подмигивает раз в двенадцать минут',
  'светит ровно и спокойно',
  'однажды загадала желание сама',
  'дружит с соседней туманностью',
  'немного стесняется, но светит ярко',
  'хранит чьё-то первое свидание',
  'напевает что-то на ультрафиолете',
  'считает пролетающие кометы',
  'греет свой уголок неба',
  'ждёт, когда её назовут по имени',
];

const FACES = ['happy', 'joy', 'sleepy', 'wink'];
const COMMON_DECORS = ['none', 'none', 'sparkles', 'swoosh', 'beads', 'dots'];
const FANCY_DECORS = ['ring', 'orbit', 'sparkles', 'dots'];

/* ===== Небесный Венец: только два главных светила ===== */
const CROWN_STARS = [
  {
    cartId: 'star-crown-sun',
    rarity: 'crown',
    variant: 'sun',
    face: 'joy',
    decor: 'none',
    name: 'Солнце',
    system: 'Солнечная система',
    desc: 'единственная звезда нашей системы — греет всё живое',
    metaText: '8 световых минут от вас',
    price: 49990,
  },
  {
    cartId: 'star-crown-moon',
    rarity: 'crown',
    variant: 'moon',
    face: 'sleepy',
    decor: 'none',
    name: 'Луна',
    system: 'Солнечная система',
    desc: 'главное светило ночного неба — ведёт счёт приливам и снам',
    metaText: '1,3 световой секунды от вас',
    price: 44990,
  },
];

/* ===== Путеводные: 10 самых известных звёзд мира =====
   Созвездия и расстояния (в световых годах) — настоящие */
const GUIDING_STARS = [
  { name: 'Полярная звезда', constellation: 'Малая Медведица', desc: 'главный ориентир Северного полушария', distance: 433 },
  { name: 'Сириус', constellation: 'Большой Пёс', desc: 'самая яркая звезда ночного неба', distance: 9 },
  { name: 'Вега', constellation: 'Лира', desc: 'часть Летнего треугольника', distance: 25 },
  { name: 'Бетельгейзе', constellation: 'Орион', desc: 'знаменитый красный сверхгигант', distance: 548 },
  { name: 'Ригель', constellation: 'Орион', desc: 'ярчайшая звезда Ориона', distance: 860 },
  { name: 'Антарес', constellation: 'Скорпион', desc: 'красный сверхгигант, «сердце Скорпиона»', distance: 554 },
  { name: 'Альтаир', constellation: 'Орёл', desc: 'вершина Летнего треугольника', distance: 17 },
  { name: 'Капелла', constellation: 'Возничий', desc: 'ярчайшая звезда Возничего', distance: 43 },
  { name: 'Арктур', constellation: 'Волопас', desc: 'ярчайшая звезда северного неба', distance: 37 },
  { name: 'Канопус', constellation: 'Киль', desc: 'вторая по яркости звезда неба', distance: 310 },
];

/* Размеры генерируемых секций (венец и путеводные заданы вручную) */
const SECTION_SIZES = { constellation: 28, distant: 60, nameless: 100 };

/* Сгенерированное «народное» имя. Формула детерминированная и не даёт
   повторов внутри секции (проверено для секций до 100 звёзд) */
const generatedName = (seed, shift) =>
  NAME_START[(seed + shift) % NAME_START.length] +
  NAME_END[
    ((seed + Math.floor(seed / NAME_START.length)) * 7 + shift * 3) %
      NAME_END.length
  ];

/* Генерация звезды заданной редкости (детерминированная по seed) */
const generateStar = (seed, rarity) => {
  const rng = mulberry32(
    (seed + RARITIES[rarity].order * 977) * 2654435761 + 1013904223
  );

  const face = pick(rng, FACES);
  const isFancy = RARITIES[rarity].order >= RARITIES.constellation.order;
  const decor = isFancy ? pick(rng, FANCY_DECORS) : pick(rng, COMMON_DECORS);

  return {
    /* cartId — стабильный ключ для корзины */
    cartId: `star-${rarity}-${seed}`,
    rarity,
    face,
    decor,
    name: generatedName(seed, RARITIES[rarity].order * 5),
    /* созвёздным — своё созвездие без повторов внутри секции */
    constellation:
      rarity === 'constellation'
        ? CONSTELLATIONS[seed % CONSTELLATIONS.length]
        : pick(rng, CONSTELLATIONS),
    desc: pick(rng, DESCRIPTIONS),
    distance: Math.floor(rng() * 900 + 40),
    price: rollPrice(rarity, rng),
  };
};

/* Путеводная звезда из справочника: мордочка и декор — детерминированные */
const buildGuidingStar = (data, i) => {
  const rng = mulberry32(i * 2654435761 + 777);
  return {
    cartId: `star-guiding-${i}`,
    rarity: 'guiding',
    face: pick(rng, FACES),
    decor: pick(rng, FANCY_DECORS),
    price: rollPrice('guiding', rng),
    ...data,
  };
};

/* Порядок секций каталога — от высшей редкости к обычной */
export const CATALOG_PLAN = ['crown', 'guiding', 'constellation', 'distant', 'nameless'];

const buildSection = (rarityId) => {
  switch (rarityId) {
    case 'crown':
      return CROWN_STARS;
    case 'guiding':
      return GUIDING_STARS.map(buildGuidingStar);
    default:
      return Array.from({ length: SECTION_SIZES[rarityId] }, (_, i) =>
        generateStar(i, rarityId)
      );
  }
};

const buildCatalog = () =>
  CATALOG_PLAN.map((rarityId) => ({
    id: rarityId,
    stars: buildSection(rarityId),
  }));

/**
 * «Запрос» каталога. Сейчас — мгновенный мок, интерфейс уже асинхронный,
 * чтобы страницы не пришлось переписывать при переходе на реальное API.
 */
export const fetchCatalog = async () => buildCatalog();
