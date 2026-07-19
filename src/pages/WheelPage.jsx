import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { RARITIES } from '../data/rarities';
import { useCart } from '../context/CartContext';
import '../style/index.css';
import '../style/Stars.css';
import '../style/Wheel.css';

/**
 * ===== Колесо Фортуны (ЗАГОТОВКА) =====
 *
 * Демо-режим: вращение и выпадение редкости работают на фронте,
 * призы ни к чему не обязывают. Каркас готов к подключению бэкенда.
 *
 * TODO(backend): результат вращения должен приходить с сервера
 *                (антифрод + честный рандом), фронт только анимирует.
 * TODO(backend): лимит вращений привязать к аккаунту, а не к сессии.
 * TODO(product): стоимость вращения / платные вращения — по решению продукта.
 */

/* Сектора колеса: порядок фиксированный, редкости из общего конфига.
   Чаще встречающиеся редкости занимают больше секторов. */
const WHEEL_SECTORS = [
  'nameless', 'constellation', 'nameless', 'named',
  'constellation', 'nameless', 'luminary', 'crown',
];

/* Цвета секторов — в тон бейджам каталога */
const SECTOR_COLORS = {
  nameless: '#26335f',
  constellation: '#2e4580',
  named: '#8a6d35',
  luminary: '#a97b2e',
  crown: '#5d3f8f',
};

const SECTOR_ANGLE = 360 / WHEEL_SECTORS.length;
const DEMO_SPINS = 3; // демо-лимит вращений на сессию

/* Мини-генератор приза. TODO(backend): приз должен приходить с сервера */
const WHEEL_NAMES = {
  nameless: ['Люмия', 'Аэлла', 'Стирия', 'Норана'],
  constellation: ['Вельмия', 'Элиста', 'Оравия', 'Юнасия'],
  named: ['Сириус', 'Вега', 'Бетельгейзе', 'Ригель'],
  luminary: ['Солнце', 'Луна'],
  crown: ['Полярная звезда', 'Око Небес'],
};

const rollPrize = (rarityId) => {
  const names = WHEEL_NAMES[rarityId];
  return {
    cartId: `wheel-${Date.now()}`,
    rarity: rarityId,
    name: names[Math.floor(Math.random() * names.length)],
    constellation: 'Фортуна',
    desc: RARITIES[rarityId].tagline,
    face: 'joy',
    decor: rarityId === 'nameless' ? 'sparkles' : 'ring',
    distance: Math.floor(Math.random() * 900 + 40),
    price: RARITIES[rarityId].priceFrom,
  };
};

/* Путь SVG-сектора колеса (центр 160,160, радиус 150) */
const sectorPath = (index) => {
  const r = 150;
  const cx = 160;
  const cy = 160;
  const a0 = ((index * SECTOR_ANGLE - 90) * Math.PI) / 180;
  const a1 = (((index + 1) * SECTOR_ANGLE - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`;
};

const WheelPage = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [rotation, setRotation] = useState(0);   // накопленный угол колеса
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState(null);      // выпавшая звезда
  const [spinsLeft, setSpinsLeft] = useState(DEMO_SPINS);
  const [taken, setTaken] = useState(false);     // приз уже забран в корзину
  const pendingRarity = useRef(null);

  /* Вращение: выбираем сектор заранее, колесо докручивается до него */
  const handleSpin = () => {
    if (spinning || spinsLeft <= 0) return;

    /* Демо-выпадение: случайный сектор колеса (равновероятно).
       TODO(backend): заменить на результат с сервера */
    const sectorIndex = Math.floor(Math.random() * WHEEL_SECTORS.length);
    pendingRarity.current = WHEEL_SECTORS[sectorIndex];

    /* угол, при котором центр сектора оказывается под стрелкой сверху */
    const sectorCenter = sectorIndex * SECTOR_ANGLE + SECTOR_ANGLE / 2;
    const current = rotation % 360;
    const target =
      rotation + (360 - current) + 5 * 360 + (360 - sectorCenter);

    setPrize(null);
    setTaken(false);
    setSpinning(true);
    setRotation(target);
  };

  /* Конец анимации — показываем приз */
  const handleSpinEnd = () => {
    if (!spinning) return;
    setSpinning(false);
    setSpinsLeft((n) => n - 1);
    setPrize(rollPrize(pendingRarity.current));
  };

  /* Забрать приз в корзину (демо: обычная позиция каталога) */
  const handleTakePrize = () => {
    if (!prize || taken) return;
    addItem(prize);
    setTaken(true);
  };

  /* Легенда шансов из конфига редкостей */
  const legend = useMemo(
    () =>
      Object.values(RARITIES)
        .sort((a, b) => a.order - b.order)
        .map((r) => ({
          id: r.id,
          label: r.label,
          share: `${Math.round(r.weight * 100)}%`,
        })),
    []
  );

  return (
    <div className="stars-page-wrapper">
      <Header />

      <div className="sky-layer far"></div>
      <div className="sky-layer near"></div>

      <main className="wheel-page">
        <section className="catalog-hero">
          <h1 className="catalog-title">Колесо Фортуны</h1>
          <p className="catalog-sub">
            Не можете выбрать — доверьтесь небу. Крутите колесо, и звезда
            найдёт вас сама.
          </p>
          {/* Плашка-предупреждение: раздел является заготовкой */}
          <div className="wheel-demo-note">
            Раздел в разработке · демо-режим, результаты ни к чему не обязывают
          </div>
        </section>

        <div className="wheel-layout">
          {/* ===== Колесо ===== */}
          <div className="wheel-stage">
            <div className="wheel-pointer"></div>
            <svg
              className="wheel-svg"
              viewBox="0 0 320 320"
              style={{ transform: `rotate(${rotation}deg)` }}
              onTransitionEnd={handleSpinEnd}
            >
              {WHEEL_SECTORS.map((rarityId, i) => (
                <g key={i}>
                  <path
                    d={sectorPath(i)}
                    fill={SECTOR_COLORS[rarityId]}
                    stroke="#0b1533"
                    strokeWidth="2"
                  />
                  {/* подпись сектора вдоль радиуса */}
                  <text
                    x="160"
                    y="52"
                    textAnchor="middle"
                    className="wheel-sector-label"
                    transform={`rotate(${i * SECTOR_ANGLE + SECTOR_ANGLE / 2} 160 160)`}
                  >
                    {RARITIES[rarityId].label}
                  </text>
                </g>
              ))}
              {/* ступица */}
              <circle cx="160" cy="160" r="34" fill="#101b3c" stroke="#e0b264" strokeWidth="2" />
              <polygon
                points="160,146 164.5,155.5 175,157 167.5,164.5 169.5,175 160,170 150.5,175 152.5,164.5 145,157 155.5,155.5"
                fill="#f3d488"
              />
            </svg>

            <button
              className="cart-primary-button wheel-spin-button"
              onClick={handleSpin}
              disabled={spinning || spinsLeft <= 0}
            >
              {spinning
                ? 'Колесо крутится…'
                : spinsLeft > 0
                  ? `Крутить (осталось ${spinsLeft})`
                  : 'Вращения закончились'}
            </button>
            <p className="wheel-spins-hint">
              {spinsLeft > 0
                ? 'демо-вращения обновляются с перезагрузкой страницы'
                : 'перезагрузите страницу, чтобы получить новые демо-вращения'}
            </p>
          </div>

          {/* ===== Правая колонка: приз или легенда ===== */}
          <div className="wheel-side">
            {prize ? (
              <div className={`sky-card wheel-prize ${prize.rarity} revealed-pop`}>
                <span className={`star-badge ${prize.rarity}-badge`}>
                  {RARITIES[prize.rarity].label}
                </span>
                <div className="star-visual">
                  <StarAvatar face={prize.face} decor={prize.decor} size={110} />
                </div>
                <h3 className="star-name">{prize.name}</h3>
                <p className="star-desc">{prize.desc}</p>
                <div className="star-foot">
                  <span className="star-price">
                    {prize.price.toLocaleString('ru-RU')} ₽
                  </span>
                  <button
                    className={`gift-button ${taken ? 'in-cart' : ''}`}
                    onClick={() => (taken ? navigate('/cart') : handleTakePrize())}
                  >
                    {taken ? 'В корзине' : 'Забрать'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="wheel-legend">
                <h3 className="wheel-legend-title">Шансы редкостей</h3>
                {legend.map((r) => (
                  <div key={r.id} className="wheel-legend-row">
                    <span className="wheel-legend-dot" style={{ background: SECTOR_COLORS[r.id] }} />
                    <span className="wheel-legend-label">{r.label}</span>
                    <span className="wheel-legend-share">{r.share}</span>
                  </div>
                ))}
                <p className="wheel-legend-note">
                  Шансы в таблице — целевые для боевого режима; в демо все
                  сектора равновероятны.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WheelPage;
