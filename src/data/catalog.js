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

/* Цвета звёзд — как на референсе: пастельная радуга */
const STAR_PALETTE = [
  'gold', 'pink', 'purple', 'green', 'orange', 'cyan', 'blue', 'lilac', 'red', 'silver',
];

/* Спектральные классы для «паспорта звезды» */
const SPECTRAL_CLASSES = ['B', 'A', 'F', 'G', 'K', 'M'];

/* Шаблоны историй; {name} и {constellation} подставляются при генерации */
const STORIES = [
  'Астрономы заметили {name} случайно, перепроверяя старые снимки созвездия {constellation}. С тех пор она числится в каталогах, но по-настоящему её ещё никто не разглядывал — вы можете стать первым.',
  'Свет {name} вышел в путь, когда на Земле ещё не было ни одного телескопа. Он летел сквозь созвездие {constellation} всё это время, чтобы однажды попасть в чьи-то глаза. Может быть, в ваши.',
  '{name} — тихая звезда на окраине созвездия {constellation}. Про такие не пишут в учебниках, зато их удобно дарить: никто не перепутает, чья она.',
  'В созвездии {constellation} сотни огней, но {name} держится чуть в стороне, как будто ждёт, что её позовут по имени. Теперь у неё есть шанс.',
  'Если найти созвездие {constellation} и вглядеться, {name} мигнёт в ответ — астрономы называют это мерцанием атмосферы, а романтики предпочитают не уточнять.',
];

const storyFor = (rng, name, constellation) =>
  pick(rng, STORIES)
    .replaceAll('{name}', name)
    .replaceAll('{constellation}', constellation);

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
    image: 'sun-1',
    /* Солнце и Луна не продаются — только из рулетки */
    dropOnly: true,
    objectType: 'звезда, жёлтый карлик',
    spectral: 'G2V',
    magnitude: '−26,7',
    story:
      'Солнце — звезда, вокруг которой крутится буквально всё: планеты, приливы, отпуска и хорошее настроение. Подарить его — самый смелый жест в этом каталоге: больше на небе дарить уже нечего.',
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
    image: 'moon-1',
    /* Солнце и Луна не продаются — только из рулетки */
    dropOnly: true,
    objectType: 'естественный спутник Земли',
    spectral: '—',
    magnitude: '−12,7',
    story:
      'Луна — единственное светило, до которого дотягивался человек, и единственное, которое каждый вечер само приходит к окну. Тот случай, когда подарок будут видеть каждую ночь — без телескопа.',
  },
];

/* ===== Путеводные: 10 самых известных звёзд мира =====
   Созвездия, расстояния (св. лет), величины и классы — настоящие */
const GUIDING_STARS = [
  { name: 'Полярная звезда', constellation: 'Малая Медведица', desc: 'путеводный свет северных ночей', distance: 433, magnitude: '1,98', spectral: 'F7Ib', color: 'gold' },
  { name: 'Сириус', constellation: 'Большой Пёс', desc: 'самая яркая звезда ночного неба', distance: 9, magnitude: '−1,46', spectral: 'A1V', color: 'silver' },
  { name: 'Вега', constellation: 'Лира', desc: 'яркая жемчужина созвездия Лиры', distance: 25, magnitude: '0,03', spectral: 'A0V', color: 'blue' },
  { name: 'Бетельгейзе', constellation: 'Орион', desc: 'красный сверхгигант, предвестник перемен', distance: 548, magnitude: '0,50', spectral: 'M1Ia', color: 'red' },
  { name: 'Ригель', constellation: 'Орион', desc: 'голубой гигант невероятной мощи', distance: 860, magnitude: '0,13', spectral: 'B8Ia', color: 'cyan' },
  { name: 'Антарес', constellation: 'Скорпион', desc: 'сердце скорпиона, пылающее во тьме', distance: 554, magnitude: '1,06', spectral: 'M1Iab', color: 'pink' },
  { name: 'Альтаир', constellation: 'Орёл', desc: 'быстрая и свободная звезда орла', distance: 17, magnitude: '0,76', spectral: 'A7V', color: 'green' },
  { name: 'Капелла', constellation: 'Возничий', desc: 'близкая и тёплая, как свет дома', distance: 43, magnitude: '0,08', spectral: 'G8III', color: 'gold' },
  { name: 'Арктур', constellation: 'Волопас', desc: 'хранитель весеннего небосвода', distance: 37, magnitude: '−0,05', spectral: 'K1.5III', color: 'lilac' },
  { name: 'Канопус', constellation: 'Киль', desc: 'второй по яркости свет южных морей', distance: 310, magnitude: '−0,74', spectral: 'A9II', color: 'blue' },
];

/* Общая история для путеводных — они говорят сами за себя */
const guidingStory = (data) =>
  `${data.name} — ${data.desc}. Её находили на небе задолго до появления карт: по таким звёздам веками сверяли путь моряки и путники. Подарить её — значит подарить ориентир.`;

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

  const name = generatedName(seed, RARITIES[rarity].order * 5);
  /* созвёздным — своё созвездие без повторов внутри секции */
  const constellation =
    rarity === 'constellation'
      ? CONSTELLATIONS[seed % CONSTELLATIONS.length]
      : pick(rng, CONSTELLATIONS);

  return {
    /* cartId — стабильный ключ для корзины */
    cartId: `star-${rarity}-${seed}`,
    rarity,
    face,
    decor,
    name,
    constellation,
    color: pick(rng, STAR_PALETTE),
    /* картинки: у созвёздных 1:1 с листом (28 штук), у остальных
       секций те же тайлы по кругу со сдвигом, чтобы соседи не совпадали */
    image: `star-${((seed + RARITIES[rarity].order * 9) % 28) + 1}`,
    desc: pick(rng, DESCRIPTIONS),
    distance: Math.floor(rng() * 900 + 40),
    price: rollPrice(rarity),
    /* «паспорт» для страницы звезды */
    magnitude: (rng() * 5 + 1.5).toFixed(2).replace('.', ','),
    spectral: `${pick(rng, SPECTRAL_CLASSES)}${Math.floor(rng() * 10)}`,
    story: storyFor(rng, name, constellation),
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
    price: rollPrice('guiding'),
    /* лист путеводных нарисован в том же порядке, что и справочник */
    image: `guiding-${i + 1}`,
    story: guidingStory(data),
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

/* Каталог детерминированный — собираем один раз и переиспользуем */
let catalogCache = null;
const getCatalog = () => {
  if (!catalogCache) catalogCache = buildCatalog();
  return catalogCache;
};

/**
 * «Запрос» каталога. Сейчас — мгновенный мок, интерфейс уже асинхронный,
 * чтобы страницы не пришлось переписывать при переходе на реальное API.
 */
export const fetchCatalog = async () => getCatalog();

/**
 * «Запрос» одной звезды по id + похожие звёзды той же редкости.
 * Возвращает { star, similar } или null, если звезда не найдена.
 * TODO(backend): заменить на fetch(`/api/stars/${cartId}`)
 */
export const fetchStar = async (cartId) => {
  const section = getCatalog().find((sec) =>
    sec.stars.some((s) => s.cartId === cartId)
  );
  if (!section) return null;

  const star = section.stars.find((s) => s.cartId === cartId);
  const pool = section.stars.filter((s) => s.cartId !== cartId);
  /* три «соседа по небу» — детерминированно, вокруг позиции звезды */
  const idx = section.stars.indexOf(star);
  const similar = Array.from(
    { length: Math.min(3, pool.length) },
    (_, i) => pool[(idx + i) % pool.length]
  );
  return { star, similar };
};
