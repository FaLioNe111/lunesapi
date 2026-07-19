/**
 * ===== Система редкостей звёзд =====
 *
 * Единый конфиг для каталога, корзины и профиля.
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
    priceFrom: 990,        // базовая цена, ₽
    priceStep: 200,        // шаг случайной надбавки
    priceSteps: 6,         // количество шагов
    tagline: 'звезда, о которой почти никто не знает',
    groupTagline: 'обычные тихие звёзды — о них почти никто не знает, но светят они честно',
  },

  /* Созвездная — звёзды, известные в составе созвездий */
  constellation: {
    id: 'constellation',
    label: 'Созвездная',
    order: 1,
    priceFrom: 2490,
    priceStep: 500,
    priceSteps: 5,
    tagline: 'известна в составе своего созвездия',
    groupTagline: 'звёзды, известные в составе своих созвездий',
  },

  /* Именная — знаменитые звёзды: Сириус, Вега, Бетельгейзе, Ригель… */
  named: {
    id: 'named',
    label: 'Именная',
    order: 2,
    priceFrom: 5990,
    priceStep: 1000,
    priceSteps: 4,
    tagline: 'её имя знают во всём мире',
    groupTagline: 'знаменитые звёзды — их имена знают во всём мире',
  },

  /* Светило — объекты, определяющие небо: Солнце и Луна */
  luminary: {
    id: 'luminary',
    label: 'Светило',
    order: 3,
    priceFrom: 19990,
    priceStep: 0,
    priceSteps: 1,
    tagline: 'объект, определяющий небо',
    groupTagline: 'объекты, определяющие небо: Солнце и Луна',
  },

  /* Небесный Венец — высшая категория, самые значимые светила */
  crown: {
    id: 'crown',
    label: 'Небесный Венец',
    order: 4,
    priceFrom: 49990,
    priceStep: 0,
    priceSteps: 1,
    tagline: 'высшая категория небесных светил',
    groupTagline: 'высшая категория — самые значимые светила неба',
  },
};

/* Список редкостей по возрастанию */
export const RARITY_ORDER = Object.values(RARITIES).sort(
  (a, b) => a.order - b.order
);

/* Имена для высшей категории */
export const CROWN_NAMES = ['Полярная звезда', 'Сириус Великий', 'Око Небес'];

/* Цена по редкости с детерминированным разбросом */
export const rollPrice = (rarityId, rng) => {
  const r = RARITIES[rarityId];
  return r.priceFrom + Math.floor(rng() * r.priceSteps) * r.priceStep;
};
