import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { RARITIES, LUMINARY_NAMES, CROWN_NAMES, rollRarity, rollPrice } from '../data/rarities';
import { useCart } from '../context/CartContext';
import '../style/index.css';
import '../style/Stars.css';

/* ===== Детерминированный генератор (чтобы лента не «прыгала» при перерисовке) ===== */
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const REAL_NAMES = [
  'Сириус', 'Вега', 'Альтаир', 'Денеб', 'Ригель', 'Капелла', 'Поллукс', 'Арктур',
  'Антарес', 'Бетельгейзе', 'Альдебаран', 'Спика', 'Мицар', 'Алькор', 'Процион',
  'Кастор', 'Регул', 'Беллатрикс', 'Альциона', 'Майя', 'Электра', 'Меропа',
  'Тайгета', 'Плейона', 'Мира', 'Альфард', 'Садр', 'Шедар', 'Алиот', 'Дубхе',
  'Мерак', 'Фекда', 'Ахернар', 'Канопус', 'Фомальгаут', 'Альхена',
];

const NAME_START = ['Лю', 'Аэ', 'Сти', 'Ми', 'Но', 'Вель', 'Эли', 'Ора', 'Юна', 'Кае', 'Сель', 'Тэя'];
const NAME_END = ['мия', 'лла', 'рия', 'нэя', 'лия', 'ста', 'вия', 'ра', 'на', 'мэль', 'сия', 'от'];

const CONSTELLATIONS = [
  'Лебедь', 'Лира', 'Орион', 'Кассиопея', 'Андромеда', 'Персей', 'Большая Медведица',
  'Малая Медведица', 'Дракон', 'Волопас', 'Близнецы', 'Телец', 'Дева', 'Лев',
  'Рыбы', 'Водолей', 'Стрелец', 'Скорпион', 'Овен', 'Весы', 'Пегас', 'Феникс',
  'Журавль', 'Голубь', 'Единорог', 'Северная Корона',
];

const DESCRIPTIONS = [
  'мерцает тёплым золотом',
  'просыпается только к полуночи',
  'любит, когда на неё смотрят вдвоём',
  'самая тихая в своём созвездии',
  'подмигивает раз в двенадцать минут',
  'светит ровно и спокойно',
  'однажды загадала желание сама',
  'дружит с соседней туманностью',
  'немного стесняется, но светит ярко',
  'хранит чьё-то первое свидание',
  'напевает что-то на ультрафиолете',
  'считает пролетающие кометы',
  'греет свой уголок неба',
  'ждёт, когда её назовут по имени',
];

const FACES = ['happy', 'joy', 'sleepy', 'wink'];
const COMMON_DECORS = ['none', 'none', 'sparkles', 'swoosh', 'beads', 'dots'];
const FANCY_DECORS = ['ring', 'orbit', 'sparkles', 'dots'];

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

/* Имя звезды зависит от редкости: высшим категориям — свои списки */
const rollName = (rarity, rng) => {
  switch (rarity) {
    case 'crown':
      return pick(rng, CROWN_NAMES);
    case 'luminary':
      return pick(rng, LUMINARY_NAMES);
    case 'named':
      return pick(rng, REAL_NAMES);
    default:
      /* безымянные и созвездные — сгенерированные «народные» имена */
      return pick(rng, NAME_START) + pick(rng, NAME_END);
  }
};

const generateStar = (seed, boost = false) => {
  const rng = mulberry32(seed * 2654435761 + 1013904223);

  /* редкость выпадает по весам из общего конфига */
  const rarity = rollRarity(rng(), boost);

  const face = pick(rng, FACES);
  const isFancy = RARITIES[rarity].order >= RARITIES.named.order;
  const decor = isFancy ? pick(rng, FANCY_DECORS) : pick(rng, COMMON_DECORS);

  const name = rollName(rarity, rng);
  const basePrice = rollPrice(rarity, rng);

  return {
    /* cartId — стабильный ключ для корзины (генератор детерминированный) */
    cartId: `star-${seed}`,
    rarity,
    face,
    decor,
    name,
    constellation: pick(rng, CONSTELLATIONS),
    desc: pick(rng, DESCRIPTIONS),
    distance: Math.floor(rng() * 900 + 40),
    price: basePrice,
  };
};

/* Текстовые бейджи без значков; безымянным бейдж не нужен */
const RARITY_LABEL = Object.fromEntries(
  Object.values(RARITIES)
    .filter((r) => r.id !== 'nameless')
    .map((r) => [r.id, r.label])
);

/* Фильтры: настроение + редкость (из общего конфига) */
const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'joy', label: 'Весёлые' },
  { id: 'sleepy', label: 'Сонные' },
  { id: 'constellation', label: 'Созвездные' },
  { id: 'named', label: 'Именные' },
  { id: 'luminary', label: 'Светила' },
  { id: 'crown', label: 'Небесный Венец' },
];

const matchesFilter = (star, filter) => {
  switch (filter) {
    case 'joy':
      return star.face === 'happy' || star.face === 'joy' || star.face === 'wink';
    case 'sleepy':
      return star.face === 'sleepy';
    case 'constellation':
    case 'named':
    case 'luminary':
    case 'crown':
      return star.rarity === filter;
    default:
      return true;
  }
};

const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/* ===== Конечная лента: небо большое, но не бесконечное ===== */
const CATALOG_SIZE = 96;   // всего карточек в каталоге
const PAGE_SIZE = 24;      // сколько подгружается за раз

const StarsPage = () => {
  const navigate = useNavigate();
  const { addItem, items: cartItems } = useCart();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filter, setFilter] = useState('all');
  const [revealed, setRevealed] = useState({});
  const [toast, setToast] = useState(null);
  const [gifted, setGifted] = useState(() => 114 + new Date().getHours() * 3);

  const toastTimer = useRef(null);
  const sentinelRef = useRef(null);

  const reachedEnd = visibleCount >= CATALOG_SIZE;

  /* тихий «живой» счётчик подарков */
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.55) setGifted((g) => g + 1);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  /* лента подгружается по прокрутке, но заканчивается на CATALOG_SIZE */
  useEffect(() => {
    if (reachedEnd) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, CATALOG_SIZE));
        }
      },
      { rootMargin: '600px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reachedEnd]);

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

  const revealMystery = (id) => {
    setRevealed((r) => {
      if (r[id]) return r;
      return { ...r, [id]: { status: 'rolling' } };
    });
    setTimeout(() => {
      const star = generateStar(id * 7919 + 13, true);
      setRevealed((r) => ({ ...r, [id]: { status: 'done', star } }));
    }, 1500);
  };

  const cards = useMemo(
    () =>
      Array.from({ length: visibleCount }, (_, i) =>
        i % 11 === 7
          ? { type: 'mystery', id: i }
          : { type: 'star', id: i, star: generateStar(i) }
      ),
    [visibleCount]
  );

  const shownCards = cards.filter((card) => {
    if (card.type === 'mystery') return filter === 'all';
    return matchesFilter(card.star, filter);
  });

  const renderStarCard = (id, star, extraClass = '', caption = null) => {
    const inCart = cartItems.some((it) => it.cartId === star.cartId);
    return (
      <article key={id} className={`sky-card ${star.rarity} ${extraClass}`}>
        {RARITY_LABEL[star.rarity] && (
          <span className={`star-badge ${star.rarity}-badge`}>
            {RARITY_LABEL[star.rarity]}
          </span>
        )}
        <div className="star-visual">
          <StarAvatar face={star.face} decor={star.decor} size={126} />
          {extraClass.includes('revealed-pop') &&
            RARITIES[star.rarity].order >= RARITIES.named.order && (
              <div className="burst">
                {BURST_ANGLES.map((a) => (
                  <span key={a} style={{ '--a': `${a}deg` }} />
                ))}
              </div>
            )}
        </div>
        <h3 className="star-name">{star.name}</h3>
        <div className="star-constellation">созвездие {star.constellation}</div>
        <p className="star-desc">{star.desc}</p>
        <div className="star-meta">{star.distance} св. лет от вас</div>
        {caption && <div className="star-caption">{caption}</div>}
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
            Мы отобрали {CATALOG_SIZE} звёзд этой ночи — листайте, пока
            какая-нибудь не посмотрит на вас в ответ. Чем выше редкость,
            тем реже такая звезда встречается на небе.
          </p>
          <div className="catalog-counter">
            <span className="counter-dot"></span>
            сегодня подарили {gifted} звёзд
          </div>
        </section>

        <div className="catalog-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`filter-chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="catalog-grid">
          {shownCards.map((card) => {
            if (card.type === 'star') {
              return renderStarCard(card.id, card.star);
            }

            const state = revealed[card.id];
            if (state?.status === 'done') {
              return renderStarCard(
                card.id,
                state.star,
                'revealed-pop',
                'сама вас выбрала'
              );
            }

            const rolling = state?.status === 'rolling';
            return (
              <article
                key={card.id}
                className={`sky-card mystery-card ${rolling ? 'rolling' : ''}`}
                onClick={() => revealMystery(card.id)}
              >
                <div className="mystery-q">?</div>
                <h3 className="mystery-title">Загаданная звезда</h3>
                <p className="mystery-hint">
                  {rolling
                    ? 'звезда выбирает вас…'
                    : 'нажмите — и узнаете, кто прячется'}
                </p>
              </article>
            );
          })}
        </div>

        {/* конец ленты: пока не дошли — лоадер, дошли — финальный блок */}
        {!reachedEnd ? (
          <div className="catalog-loader" ref={sentinelRef}>
            <div className="loader-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            небо продолжается…
          </div>
        ) : (
          <div className="catalog-end">
            <div className="catalog-end-line"></div>
            <p className="catalog-end-title">На сегодня это всё небо</p>
            <p className="catalog-end-sub">
              Вы посмотрели все {CATALOG_SIZE} звёзд этой ночи. Не нашли свою —
              попробуйте испытать удачу.
            </p>
            <button className="catalog-end-button" onClick={() => navigate('/wheel')}>
              Крутить колесо фортуны
            </button>
          </div>
        )}
      </main>

      {toast && <div className="sky-toast">{toast}</div>}

      <Footer />
    </div>
  );
};

export default StarsPage;
