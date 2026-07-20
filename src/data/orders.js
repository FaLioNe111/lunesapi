/**
 * ===== Заказы (мок-API) =====
 *
 * Хранение истории заказов. Сейчас — localStorage ('orders'),
 * интерфейс асинхронный: при подключении бэкенда меняется только
 * этот модуль.
 *
 * TODO(backend): fetchOrders → GET /api/orders,
 *                createOrder → POST /api/orders (после оплаты).
 */

const ORDERS_KEY = 'orders';

const readOrders = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/* История заказов, новые сверху */
export const fetchOrders = async () => readOrders();

/* Создание заказа; возвращает сохранённый заказ */
export const createOrder = async (order) => {
  const orders = readOrders();
  orders.unshift(order);
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    /* хранилище недоступно — заказ просто не попадёт в историю */
  }
  return order;
};
