/**
 * ===== Система редкостей звёзд =====
 *
 * Единый конфиг для каталога, корзины и профиля.
 * Значки (эмодзи) намеренно не используются — только текстовые бейджи,
 * различающиеся цветом (класс бейджа = `${id}-badge`, класс карточки = id).
 *
 * План каталога — ровно 200 объектов:
 *   Небесный Венец — 2 (только Солнце и Луна)
 *   Путеводная     — 10 (самые известные звёзды мира)
 *   Созвёздная     — 28
 *   Далёкая        — 60
 *   Безымянная     — 100
 *
 * Порядок — от самой частой к самой редкой.
 */

export const RARITIES = {
  /* Безымянная — обычные слабые звёзды, о которых почти никто не знает */
  nameless: {
    id: 'nameless',
    label: 'Безымянная',
    order: 0,
    priceFrom: 990,        // базовая цена, ₽
    priceStep: 200,        // шаг случайной надбавки
    priceSteps: 6,         // количество шагов
    tagline: 'звезда, о которой почти никто не знает',
    groupTagline: 'обычные тихие звёзды — их сотня, и каждая ждёт своего человека',
  },

  /* Далёкая — звёзды из глубины неба */
  distant: {
    id: 'distant',
    label: 'Далёкая',
    order: 1,
    priceFrom: 1990,
    priceStep: 300,
    priceSteps: 7,
    tagline: 'светит из глубины неба',
    groupTagline: 'их свет идёт к нам сотни лет — тем ценнее, что он дошёл',
  },

  /* Созвёздная — звёзды, известные в составе созвездий */
  constellation: {
    id: 'constellation',
    label: 'Созвёздная',
    order: 2,
    priceFrom: 3990,
    priceStep: 500,
    priceSteps: 6,
    tagline: 'известна в составе своего созвездия',
    groupTagline: 'звёзды, известные в составе своих созвездий',
  },

  /* Путеводная — самые известные звёзды мира: Полярная, Сириус, Вега… */
  guiding: {
    id: 'guiding',
    label: 'Путеводная',
    order: 3,
    priceFrom: 9990,
    priceStep: 1000,
    priceSteps: 6,
    tagline: 'по ней веками сверяли путь',
    groupTagline: 'самые известные звёзды мира — по ним веками сверяли путь',
  },

  /* Небесный Венец — вершина каталога: только Солнце и Луна */
  crown: {
    id: 'crown',
    label: 'Небесный Венец',
    order: 4,
    priceFrom: 39990,
    priceStep: 0,
    priceSteps: 1,
    tagline: 'главное светило неба',
    groupTagline: 'вершина каталога — только два главных светила: Солнце и Луна',
  },
};

/* Список редкостей по возрастанию */
export const RARITY_ORDER = Object.values(RARITIES).sort(
  (a, b) => a.order - b.order
);

/* Старые идентификаторы редкостей из ранних версий макета.
   Нужны, чтобы корзина и заказы в localStorage не ломались после обновлений */
const LEGACY_RARITY_MAP = {
  common: 'nameless',
  rare: 'constellation',
  special: 'guiding',
  named: 'guiding',
  luminary: 'crown',
};

/**
 * Нормализация редкости: принимает любой исторический id, возвращает актуальный.
 * TODO(backend): сервер должен отдавать только актуальные id из RARITIES,
 *                тогда нормализация останется только для старых локальных данных.
 */
export const normalizeRarity = (id) =>
  RARITIES[id] ? id : LEGACY_RARITY_MAP[id] || 'nameless';

/* Цена по редкости с детерминированным разбросом */
export const rollPrice = (rarityId, rng) => {
  const r = RARITIES[rarityId];
  return r.priceFrom + Math.floor(rng() * r.priceSteps) * r.priceStep;
};
