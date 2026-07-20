/**
 * ===== Авторизация (мок-API) =====
 *
 * Единственное место работы с пользователем. Сейчас всё хранится в
 * localStorage ('currentUser'), интерфейс уже асинхронный — при
 * подключении бэкенда меняется только этот модуль.
 *
 * TODO(backend): login/register → POST /api/auth/…, хранить токен,
 *                getCurrentUser → GET /api/me.
 */

const USER_KEY = 'currentUser';

/* Синхронное чтение текущего пользователя (для шапки и стартовых значений) */
export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
};

const saveUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
};

/* Вход. Мок: принимает любые данные и создаёт пользователя */
export const login = async ({ username }) => {
  return saveUser({
    username,
    name: username, // если нет отдельного поля name, используем username
    email: `${username}@example.com`,
  });
};

/* Регистрация */
export const register = async ({ name, username }) => {
  return saveUser({
    name,
    username,
    email: `${username}@example.com`,
  });
};

/* Обновление профиля (настройки в личном кабинете) */
export const updateProfile = async (patch) => {
  return saveUser({ ...getCurrentUser(), ...patch });
};

/* Выход */
export const logout = async () => {
  localStorage.removeItem(USER_KEY);
};

/* Восстановление пароля. Мок: просто «отправляем письмо» */
export const requestPasswordReset = async () => {
  return { ok: true };
};
