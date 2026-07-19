import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { normalizeRarity } from '../data/rarities';

/**
 * ===== Корзина (только фронт) =====
 *
 * Хранит выбранные звёзды в localStorage, чтобы корзина переживала
 * перезагрузку страницы. Каждая звезда уникальна, поэтому количества нет —
 * только добавить/убрать.
 *
 * TODO(backend): заменить localStorage на API корзины.
 */

const CART_STORAGE_KEY = 'starCart';

const CartContext = createContext(null);

/* Чтение корзины из localStorage с защитой от битых данных.
   Редкости нормализуются: в хранилище могут лежать старые id */
const readStoredCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((it) => ({ ...it, rarity: normalizeRarity(it.rarity) }));
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(readStoredCart);

  /* Синхронизация с localStorage при каждом изменении */
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* приватный режим / переполненное хранилище — молча пропускаем */
    }
  }, [items]);

  const value = useMemo(() => {
    /* Добавить звезду. Возвращает false, если она уже в корзине.
       Проверка — по текущему снимку items, а не внутри апдейтера:
       в StrictMode React вызывает апдейтер дважды, и флаг там врёт */
    const addItem = (star) => {
      const exists = items.some((it) => it.cartId === star.cartId);
      if (!exists) {
        setItems((prev) =>
          prev.some((it) => it.cartId === star.cartId)
            ? prev
            : [...prev, { ...star, giftedTo: '', addedAt: Date.now() }]
        );
      }
      return !exists;
    };

    const removeItem = (cartId) =>
      setItems((prev) => prev.filter((it) => it.cartId !== cartId));

    /* Обновить поля позиции (например, имя получателя подарка) */
    const updateItem = (cartId, patch) =>
      setItems((prev) =>
        prev.map((it) => (it.cartId === cartId ? { ...it, ...patch } : it))
      );

    const clearCart = () => setItems([]);

    const totalPrice = items.reduce((sum, it) => sum + it.price, 0);

    return {
      items,
      addItem,
      removeItem,
      updateItem,
      clearCart,
      totalPrice,
      count: items.length,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/* Хук доступа к корзине */
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart можно вызывать только внутри <CartProvider>');
  }
  return ctx;
};
