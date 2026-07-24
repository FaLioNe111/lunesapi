/**
 * ===== Настройки звёзд в личном кабинете =====
 *
 * Звёзды приходят из трёх источников (выигрыши, заказы, демо-набор), и
 * править их «на месте» нельзя. Поэтому пользовательские правки лежат
 * отдельным слоем-оверрайдом с ключом по id звезды, а при отрисовке
 * накладываются поверх исходных данных.
 *
 * TODO(backend):
 *   PATCH  /api/me/stars/:id  { name, giftedTo, giftMessage, hidden }
 *   DELETE /api/me/stars/:id
 *   GET    /api/me/stars      → уже с учётом правок, тогда этот слой не нужен
 */

const PREFS_KEY = 'starPrefs';

const readPrefs = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writePrefs = (prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* хранилище недоступно — правки не сохранятся */
  }
  return prefs;
};

export const fetchStarPrefs = async () => readPrefs();

/** Правка звезды: имя, получатель, пожелание, скрытие */
export const patchStar = async (id, patch) => {
  const prefs = readPrefs();
  prefs[id] = { ...(prefs[id] || {}), ...patch };
  return writePrefs(prefs);
};

/** Удаление: помечаем, а не стираем — источник (заказ, выигрыш) остаётся цел */
export const deleteStar = async (id) => patchStar(id, { deleted: true });

/** Полный сброс правок конкретной звезды */
export const resetStar = async (id) => {
  const prefs = readPrefs();
  delete prefs[id];
  return writePrefs(prefs);
};

/**
 * Накладывает правки на список звёзд.
 * Удалённые убираются всегда, скрытые — если showHidden = false.
 */
export const applyStarPrefs = (stars, prefs, showHidden = false) =>
  stars
    .map((s) => {
      const p = prefs[s.id];
      if (!p) return s;
      return {
        ...s,
        name: p.name || s.name,
        giftedTo: p.giftedTo !== undefined ? p.giftedTo : s.giftedTo,
        giftMessage: p.giftMessage !== undefined ? p.giftMessage : s.giftMessage,
        hidden: !!p.hidden,
        deleted: !!p.deleted,
      };
    })
    .filter((s) => !s.deleted)
    .filter((s) => showHidden || !s.hidden);

/** Можно ли переименовать: выигранные и безымянные — да, остальные нет */
export const canRename = (star) => !!star.won || star.rarity === 'nameless';
