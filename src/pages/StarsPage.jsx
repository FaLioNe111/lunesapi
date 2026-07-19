import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { RARITIES } from '../data/rarities';
import { fetchCatalog } from '../data/catalog';
import { useCart } from '../context/CartContext';
import '../style/index.css';
import '../style/Stars.css';

/* Текстовые бейджи без значков; безымянным бейдж не нужен */
const RARITY_LABEL = Object.fromEntries(
  Object.values(RARITIES)
    .filter((r) => r.id !== 'nameless')
    .map((r) => [r.id, r.label])
);

const StarsPage = () => {
  const navigate = useNavigate();
  const { addItem, items: cartItems } = useCart();

  /* каталог приходит из слоя данных; null — ещё загружается.
     TODO(backend): при реальном API добавить обработку ошибок загрузки */
  const [sections, setSections] = useState(null);

  const [toast, setToast] = useState(null);
  const [gifted, setGifted] = useState(() => 114 + new Date().getHours() * 3);

  const toastTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    fetchCatalog().then((data) => {
      if (alive) setSections(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  const totalStars = (sections || []).reduce(
    (sum, s) => sum + s.stars.length,
    0
  );

  /* тихий «живой» счётчик подарков */
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.55) setGifted((g) => g + 1);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /* «Подарить» = положить в корзину */
  const handleGift = (star) => {
    const added = addItem(star);
    showToast(
      added
        ? `«${star.name}» ждёт вас в корзине`
        : `«${star.name}» уже лежит в корзине`
    );
  };

  const renderStarCard = (star) => {
    const inCart = cartItems.some((it) => it.cartId === star.cartId);
    return (
      <article
        key={star.cartId}
        className={`sky-card ${star.rarity} ${star.variant || ''}`}
      >
        {RARITY_LABEL[star.rarity] && (
          <span className={`star-badge ${star.rarity}-badge`}>
            {RARITY_LABEL[star.rarity]}
          </span>
        )}
        <div className="star-visual">
          <StarAvatar face={star.face} decor={star.decor} size={126} />
        </div>
        <h3 className="star-name">{star.name}</h3>
        <div className="star-constellation">
          {star.system || `созвездие ${star.constellation}`}
        </div>
        <p className="star-desc">{star.desc}</p>
        <div className="star-meta">
          {star.metaText || `${star.distance} св. лет от вас`}
        </div>
        <div className="star-foot">
          <span className="star-price">{star.price.toLocaleString('ru-RU')} ₽</span>
          <button
            className={`gift-button ${inCart ? 'in-cart' : ''}`}
            onClick={() => (inCart ? navigate('/cart') : handleGift(star))}
          >
            {inCart ? 'В корзине' : 'Подарить'}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="stars-page-wrapper">
      <Header />

      <div className="sky-layer far"></div>
      <div className="sky-layer near"></div>
      <div className="shooting-star s1"></div>
      <div className="shooting-star s2"></div>
      <div className="shooting-star s3"></div>

      <main className="stars-catalog">
        <section className="catalog-hero">
          <h1 className="catalog-title">Каталог звёзд</h1>
          <p className="catalog-sub">
            {totalStars || 200} небесных объектов, разложенных по редкости.
            На вершине — только Солнце и Луна, а все самые известные звёзды
            мира ступенью ниже.
          </p>
          <div className="catalog-counter">
            <span className="counter-dot"></span>
            сегодня подарили {gifted} звёзд
          </div>
        </section>

        {sections === null ? (
          /* каталог ещё загружается */
          <div className="catalog-loading">
            <div className="loader-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            открываем небо…
          </div>
        ) : (
          <>
            {/* Секции по редкости */}
            {sections.map((sec) => (
              <section
                key={sec.id}
                id={`rarity-${sec.id}`}
                className="rarity-section"
              >
                <div className="rarity-section-head">
                  <h2 className={`rarity-section-title ${sec.id}`}>
                    {RARITIES[sec.id].label}
                  </h2>
                  <span className="rarity-section-count">{sec.stars.length}</span>
                  <p className="rarity-section-tagline">
                    {RARITIES[sec.id].groupTagline}
                  </p>
                </div>
                <div
                  className={`catalog-grid ${sec.id === 'crown' ? 'crown-grid' : ''}`}
                >
                  {sec.stars.map((star) => renderStarCard(star))}
                </div>
              </section>
            ))}

            <div className="catalog-end">
              <div className="catalog-end-line"></div>
              <p className="catalog-end-title">На сегодня это всё небо</p>
              <p className="catalog-end-sub">
                {totalStars} объектов — от Солнца и Луны до безымянных звёзд.
                Какая-то из них уже смотрит на вас в ответ.
              </p>
            </div>
          </>
        )}
      </main>

      {toast && <div className="sky-toast">{toast}</div>}

      <Footer />
    </div>
  );
};

export default StarsPage;
