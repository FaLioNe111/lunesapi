/**
 * ===== Подарочные ссылки =====
 *
 * Ссылку на подарок нельзя делать короткой и угадываемой: её показывают
 * в виде QR-кода, а такой кадр легко попадает в чужое видео или скриншот.
 * Поэтому адрес выглядит как длинный непрозрачный токен, а не как
 * «/gift/star-guiding-1?to=Аня».
 *
 * TODO(backend): сейчас данные зашиты в сам токен (фронт без сервера).
 *   На проде должно быть наоборот:
 *     POST /api/gifts        → { token }    // сервер сам генерирует и хранит
 *     GET  /api/gifts/:token → { star, to, from, message, opened }
 *   Тогда токен — просто случайные 32+ байта, и по нему ничего не восстановить
 *   без базы. Формат ссылки при этом не изменится: /gift/<token>.
 */

const TOKEN_VERSION = 'z1';

/* base64url, чтобы токен жил в адресе без экранирования */
const toBase64Url = (bytes) => {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (str) => {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/* случайная соль — она же делает ссылку длинной и неугадываемой */
const randomBytes = (n) => {
  const arr = new Uint8Array(n);
  (window.crypto || window.msCrypto).getRandomValues(arr);
  return arr;
};

/**
 * Собирает токен подарка.
 * Полезная нагрузка + 48 байт случайной соли → на выходе ~200–300 символов.
 */
export const createGiftToken = ({ cartId, to = '', from = '', message = '', name = '' }) => {
  const payload = JSON.stringify({ c: cartId, t: to, f: from, m: message, n: name });
  const body = new TextEncoder().encode(payload);
  const salt = randomBytes(48);

  /* соль спереди, полезная нагрузка следом */
  const merged = new Uint8Array(salt.length + body.length);
  merged.set(salt, 0);
  merged.set(body, salt.length);

  return `${TOKEN_VERSION}${toBase64Url(merged)}`;
};

/** Разбирает токен обратно. Вернёт null, если это не наш токен. */
export const parseGiftToken = (token) => {
  if (!token || !token.startsWith(TOKEN_VERSION)) return null;
  try {
    const bytes = fromBase64Url(token.slice(TOKEN_VERSION.length));
    const body = bytes.slice(48); // отбрасываем соль
    const data = JSON.parse(new TextDecoder().decode(body));
    return {
      cartId: data.c,
      to: data.t || '',
      from: data.f || '',
      message: data.m || '',
      name: data.n || '',
    };
  } catch {
    return null;
  }
};

/** Полная ссылка на подарок */
export const makeGiftUrl = (params) =>
  `${window.location.origin}/gift/${createGiftToken(params)}`;
