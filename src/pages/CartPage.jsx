import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { RARITIES } from '../data/rarities';
import { getCurrentUser } from '../data/auth';
import { createOrder } from '../data/orders';
import { useCart } from '../context/CartContext';
import '../style/index.css';
import '../style/Stars.css';
import '../style/Cart.css';

/**
 * ===== Корзина и оформление заказа (только фронт) =====
 *
 * Шаги: cart → checkout → payment → success.
 * Оплата имитируется «переносом на страницу оплаты» с задержкой.
 * TODO(backend): подключить реальный платёжный шлюз (ЮKassa / СБП / Tinkoff)
 *                на шаге payment вместо имитации.
 */

/* Промокоды-заглушки. TODO(backend): проверка промокода на сервере */
const PROMO_CODES = {
  STAR10: 0.1,   // −10%
  COMETA20: 0.2, // −20%
};

/* Способы оплаты (мок) */
const PAYMENT_METHODS = [
  { id: 'sbp', label: 'СБП', hint: 'оплата по QR-коду через ваш банк' },
  { id: 'card', label: 'Банковская карта', hint: 'МИР, Visa, Mastercard' },
  { id: 'yookassa', label: 'ЮKassa', hint: 'кошелёк и другие способы' },
];

/* Подписи шагов для прогресс-бара */
const STEPS = [
  { id: 'cart', label: 'Корзина' },
  { id: 'checkout', label: 'Оформление' },
  { id: 'payment', label: 'Оплата' },
  { id: 'success', label: 'Готово' },
];

const formatPrice = (n) => `${n.toLocaleString('ru-RU')} ₽`;

const CartPage = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateItem, clearCart, totalPrice } = useCart();

  const [step, setStep] = useState('cart');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);         // { code, discount }
  const [promoError, setPromoError] = useState(null);
  /* подставляем имя и почту из профиля, если пользователь залогинен */
  const [senderName, setSenderName] = useState(() => getCurrentUser()?.name || '');
  const [senderEmail, setSenderEmail] = useState(() => getCurrentUser()?.email || '');
  const [giftMessage, setGiftMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('sbp');
  const [paying, setPaying] = useState(false);       // имитация переноса на оплату
  const [payError, setPayError] = useState(false);   // «банк отклонил операцию»
  const [orderNumber, setOrderNumber] = useState(null);
  const [formError, setFormError] = useState(null);

  const discount = promo ? Math.round(totalPrice * promo.discount) : 0;
  const finalPrice = totalPrice - discount;

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  /* Применение промокода */
  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (PROMO_CODES[code]) {
      setPromo({ code, discount: PROMO_CODES[code] });
      setPromoError(null);
    } else {
      setPromo(null);
      setPromoError('Такого промокода нет — попробуйте STAR10');
    }
  };

  /* Валидация шага оформления */
  const goToPayment = () => {
    if (!senderName.trim()) {
      setFormError('Укажите ваше имя — оно будет в письме с подарком');
      return;
    }
    if (!senderEmail.trim() || !senderEmail.includes('@')) {
      setFormError('Нужен корректный e-mail — на него придёт письмо с подарком');
      return;
    }
    setFormError(null);
    setStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* Имитация оплаты: «перенос на страницу оплаты» → успех.
     TODO(backend): здесь должен быть redirect на платёжный шлюз */
  const handlePay = () => {
    setPaying(true);
    setPayError(false);
    setTimeout(() => {
      /* демо: изредка платёж «не проходит», чтобы показать сценарий ошибки.
         TODO(backend): здесь будет реальный ответ платёжного шлюза */
      if (Math.random() < 0.15) {
        setPaying(false);
        setPayError(true);
        return;
      }

      const num = `ZV-${Date.now().toString().slice(-6)}`;
      setOrderNumber(num);

      /* сохраняем заказ через мок-API — его увидит личный кабинет */
      createOrder({
        number: num,
        date: new Date().toLocaleDateString('ru-RU'),
        items: items.map((it) => ({
          cartId: it.cartId,
          name: it.name,
          rarity: it.rarity,
          constellation: it.constellation,
          face: it.face,
          decor: it.decor,
          price: it.price,
          giftedTo: it.giftedTo || senderName,
        })),
        total: finalPrice,
        paymentMethod,
        status: 'Оплачен',
      });

      clearCart();
      setPaying(false);
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1800);
  };

  /* Сводка заказа — одинакова на шагах checkout и payment */
  const orderSummary = useMemo(
    () => (
      <aside className="cart-summary">
        <h3 className="cart-summary-title">Ваш заказ</h3>
        <div className="cart-summary-row">
          <span>Звёзды ({items.length})</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>
        {promo && (
          <div className="cart-summary-row discount">
            <span>Промокод {promo.code}</span>
            <span>−{formatPrice(discount)}</span>
          </div>
        )}
        <div className="cart-summary-row">
          <span>Письмо с подарком</span>
          <span>бесплатно</span>
        </div>
        <div className="cart-summary-total">
          <span>Итого</span>
          <span>{formatPrice(finalPrice)}</span>
        </div>
      </aside>
    ),
    [items.length, totalPrice, promo, discount, finalPrice]
  );

  return (
    <div className="stars-page-wrapper">
      <Header />

      {/* то же звёздное небо, что и в каталоге — единый стиль */}
      <div className="sky-layer far"></div>
      <div className="sky-layer near"></div>

      <main className="cart-page">
        <h1 className="catalog-title cart-title">
          {step === 'success' ? 'Спасибо!' : 'Корзина'}
        </h1>

        {/* Прогресс шагов */}
        <div className="cart-steps">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <div className={`cart-step-line ${i <= stepIndex ? 'done' : ''}`} />}
              <div className={`cart-step ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}>
                <span className="cart-step-num">{i + 1}</span>
                <span className="cart-step-label">{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* ===== Шаг 1: корзина ===== */}
        {step === 'cart' && (
          items.length === 0 ? (
            <div className="cart-empty">
              <p className="cart-empty-title">В корзине пока пусто</p>
              <p className="cart-empty-sub">
                Загляните в каталог — там целое небо звёзд ждёт своих людей
              </p>
              <button className="cart-primary-button" onClick={() => navigate('/stars')}>
                Выбрать звезду
              </button>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items">
                {items.map((it) => (
                  <article key={it.cartId} className={`cart-item ${it.rarity}`}>
                    <div className="cart-item-visual">
                      <StarAvatar face={it.face} decor={it.decor} size={84} />
                    </div>
                    <div className="cart-item-info">
                      <div className="cart-item-head">
                        <h3 className="cart-item-name">{it.name}</h3>
                        <span className={`star-badge ${it.rarity}-badge cart-item-badge`}>
                          {RARITIES[it.rarity].label}
                        </span>
                      </div>
                      <div className="cart-item-constellation">
                        созвездие {it.constellation}
                      </div>
                      <p className="cart-item-desc">
                        {/* у призов с колеса desc уже равен tagline — не дублируем */}
                        {it.desc === RARITIES[it.rarity].tagline
                          ? it.desc
                          : `${it.desc}; ${RARITIES[it.rarity].tagline}`}
                      </p>
                      <input
                        className="cart-item-recipient"
                        type="text"
                        placeholder="Кому дарите? (имя получателя)"
                        value={it.giftedTo}
                        onChange={(e) => updateItem(it.cartId, { giftedTo: e.target.value })}
                      />
                    </div>
                    <div className="cart-item-side">
                      <span className="cart-item-price">{formatPrice(it.price)}</span>
                      <button
                        className="cart-item-remove"
                        onClick={() => removeItem(it.cartId)}
                        aria-label={`Убрать ${it.name} из корзины`}
                      >
                        Убрать
                      </button>
                    </div>
                  </article>
                ))}

                {/* Промокод */}
                <div className="cart-promo">
                  <input
                    className="cart-promo-input"
                    type="text"
                    placeholder="Промокод (например, STAR10)"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                  />
                  <button className="cart-secondary-button" onClick={applyPromo}>
                    Применить
                  </button>
                </div>
                {promoError && <p className="cart-error">{promoError}</p>}
                {promo && (
                  <p className="cart-promo-ok">
                    Промокод {promo.code} применён: −{Math.round(promo.discount * 100)}%
                  </p>
                )}
              </div>

              <div className="cart-side-col">
                {orderSummary}
                <button
                  className="cart-primary-button wide"
                  onClick={() => {
                    setStep('checkout');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Оформить заказ
                </button>
                <button className="cart-ghost-button" onClick={() => navigate('/stars')}>
                  Продолжить выбор
                </button>
              </div>
            </div>
          )
        )}

        {/* ===== Шаг 2: оформление ===== */}
        {step === 'checkout' && (
          <div className="cart-layout">
            <div className="cart-form">
              <h3 className="cart-form-title">Данные для подарка</h3>

              <label className="cart-field">
                <span className="cart-field-label">Ваше имя</span>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Например, Станислав"
                />
              </label>

              <label className="cart-field">
                <span className="cart-field-label">E-mail для письма с подарком</span>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>

              <label className="cart-field">
                <span className="cart-field-label">Пожелание к подарку (необязательно)</span>
                <textarea
                  rows="3"
                  value={giftMessage}
                  onChange={(e) => setGiftMessage(e.target.value)}
                  placeholder="Пусть эта звезда светит только тебе…"
                />
              </label>

              {formError && <p className="cart-error">{formError}</p>}

              <div className="cart-form-actions">
                <button className="cart-ghost-button" onClick={() => setStep('cart')}>
                  Назад в корзину
                </button>
                <button className="cart-primary-button" onClick={goToPayment}>
                  Перейти к оплате
                </button>
              </div>
            </div>

            <div className="cart-side-col">{orderSummary}</div>
          </div>
        )}

        {/* ===== Шаг 3: оплата ===== */}
        {step === 'payment' && (
          <div className="cart-layout">
            <div className="cart-form">
              <h3 className="cart-form-title">Способ оплаты</h3>

              <div className="cart-pay-methods">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    className={`cart-pay-method ${paymentMethod === m.id ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(m.id)}
                  >
                    <span className="cart-pay-method-label">{m.label}</span>
                    <span className="cart-pay-method-hint">{m.hint}</span>
                  </button>
                ))}
              </div>

              <p className="cart-pay-note">
                После нажатия кнопки мы перенесём вас на защищённую страницу
                оплаты. Данные карты вводятся только на стороне платёжной
                системы.
              </p>

              {payError && (
                <div className="cart-pay-error">
                  Оплата не прошла — банк отклонил операцию. Деньги не списаны:
                  попробуйте ещё раз или выберите другой способ оплаты.
                </div>
              )}

              {paying ? (
                <div className="cart-paying">
                  <div className="loader-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  переносим на страницу оплаты…
                </div>
              ) : (
                <div className="cart-form-actions">
                  <button className="cart-ghost-button" onClick={() => setStep('checkout')}>
                    Назад
                  </button>
                  <button className="cart-primary-button" onClick={handlePay}>
                    Оплатить {formatPrice(finalPrice)}
                  </button>
                </div>
              )}
            </div>

            <div className="cart-side-col">{orderSummary}</div>
          </div>
        )}

        {/* ===== Шаг 4: успех ===== */}
        {step === 'success' && (
          <div className="cart-success">
            <div className="cart-success-star">
              <StarAvatar face="joy" decor="sparkles" size={120} />
            </div>
            <h2 className="cart-success-title">Заказ {orderNumber} оплачен</h2>
            <p className="cart-success-sub">
              Письмо с подарком уже летит на {senderEmail}. Все подаренные
              звёзды появились в вашем личном кабинете.
            </p>
            <div className="cart-form-actions center">
              <button className="cart-primary-button" onClick={() => navigate('/profile')}>
                В личный кабинет
              </button>
              <button className="cart-ghost-button" onClick={() => navigate('/stars')}>
                Подарить ещё одну
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CartPage;
