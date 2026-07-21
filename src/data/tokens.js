/**
 * ===== Токены (мок-API) =====
 *
 * Токены — валюта для рулетки: за них будут крутить колесо и получать
 * звёзды, которые нельзя купить (Солнце и Луна).
 *
 * Сейчас баланс лежит в localStorage ('tokenBalance'), интерфейс
 * асинхронный — при подключении бэкенда меняется только этот модуль.
 *
 * TODO(backend): getBalance → GET /api/tokens,
 *                buyTokens → POST /api/tokens/purchase (после оплаты),
 *                spendToken → POST /api/roulette/spin.
 */

const TOKENS_KEY = 'tokenBalance';

/* Наборы токенов на продажу: чем больше набор, тем выгоднее токен */
export const TOKEN_PACKS = [
  { id: 'pack1', amount: 1, price: 99 },
  { id: 'pack5', amount: 5, price: 449 },
  { id: 'pack10', amount: 10, price: 799 },
  { id: 'pack100', amount: 100, price: 7499 },
];

/* Синхронное чтение баланса (для шапки и стартовых значений) */
export const getBalance = () => {
  const raw = Number(localStorage.getItem(TOKENS_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
};

const saveBalance = (value) => {
  const next = Math.max(0, value);
  localStorage.setItem(TOKENS_KEY, String(next));
  /* событие для шапки: баланс мог измениться на другой странице */
  window.dispatchEvent(new CustomEvent('tokens:change', { detail: next }));
  return next;
};

/* Покупка набора токенов. TODO(backend): сначала оплата, потом начисление */
export const buyTokens = async (pack) => saveBalance(getBalance() + pack.amount);

/* Списание токена на вращение рулетки */
export const spendToken = async (count = 1) => {
  const balance = getBalance();
  if (balance < count) return { ok: false, balance };
  return { ok: true, balance: saveBalance(balance - count) };
};

/* Склонение: 1 токен / 2 токена / 5 токенов */
export const tokenWord = (n) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'токен';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'токена';
  return 'токенов';
};
