/**
 * ===== Система редкостей звёзд =====
 *
 * Единый конфиг для каталога, корзины, профиля и колеса фортуны.
 * Значки (эмодзи) намеренно не используются — только текстовые бейджи,
 * различающиеся цветом (класс бейджа = `${id}-badge`, класс карточки = id).
 *
 * Порядок — от самой частой к самой редкой.
 */

export const RARITIES = {
  /* Безымянная — обычные слабые звёзды, о которых почти никто не знает */
  nameless: {
    id: 'nameless',
    label: 'Безымянная',
    order: 0,
    weight: 0.52,          // доля выпадения в каталоге
    priceFrom: 990,        // базовая цена, ₽
    priceStep: 200,        // шаг случайной надбавки
    priceSteps: 6,         // количество шагов
    tagline: 'звезда, о которой почти никто не знает',
  },

  /* Созвездная — звёзды, известные в составе созвездий */
  constellation: {
    id: 'constellation',
    label: 'Созвездная',
    order: 1,
    weight: 0.3,
    priceFrom: 2490,
    priceStep: 500,
    priceSteps: 5,
    tagline: 'известна в составе своего созвездия',
  },

  /* Именная — знаменитые звёзды: Сириус, Вега, Бетельгейзе, Ригель… */
  named: {
    id: 'named',
    label: 'Именная',
    order: 2,
    weight: 0.14,
    priceFrom: 5990,
    priceStep: 1000,
    priceSteps: 4,
    tagline: 'её имя знают во всём мире',
  },

  /* Светило — объекты, определяющие небо: Солнце и Луна */
  luminary: {
    id: 'luminary',
    label: 'Светило',
    order: 3,
    weight: 0.03,
    priceFrom: 19990,
    priceStep: 0,
    priceSteps: 1,
    tagline: 'объект, определяющий небо',
  },

  /* Небесный Венец — высшая категория, самые значимые светила */
  crown: {
    id: 'crown',
    label: 'Небесный Венец',
    order: 4,
    weight: 0.01,
    priceFrom: 49990,
    priceStep: 0,
    priceSteps: 1,
    tagline: 'высшая категория небесных светил',
  },
};

/* Список редкостей по возрастанию (удобно для выпадения и колеса) */
export const RARITY_ORDER = Object.values(RARITIES).sort(
  (a, b) => a.order - b.order
);

/* Имена для высших категорий */
export const LUMINARY_NAMES = ['Солнце', 'Луна'];
export const CROWN_NAMES = ['Полярная звезда', 'Сириус Великий', 'Око Небес'];

/**
 * Выбор редкости по броску rng() с учётом весов.
 * boost — сдвигает шансы вверх (используется в «загаданной звезде» и колесе).
 * TODO(backend): в проде редкость должна приходить с сервера.
 */
export const rollRarity = (roll, boost = false) => {
  let r = boost ? Math.pow(roll, 0.45) : roll; // boost прижимает бросок к 1
  let acc = 0;
  for (const rarity of RARITY_ORDER) {
    acc += rarity.weight;
    if (r < acc) return rarity.id;
  }
  return RARITY_ORDER[RARITY_ORDER.length - 1].id;
};

/* Цена по редкости с детерминированным разбросом */
export const rollPrice = (rarityId, rng) => {
  const r = RARITIES[rarityId];
  return r.priceFrom + Math.floor(rng() * r.priceSteps) * r.priceStep;
};
