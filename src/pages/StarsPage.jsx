import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { RARITIES, CROWN_NAMES, rollPrice } from '../data/rarities';
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

/* Сгенерированное «народное» имя. Формула детерминированная и не
   повторяется внутри секции (начала различны для первых 12 индексов) */
const generatedName = (seed, shift) =>
  NAME_START[(seed + shift) % NAME_START.length] +
  NAME_END[((seed + Math.floor(seed / NAME_START.length)) * 7 + shift * 3) % NAME_END.length];

/* Имя звезды по редкости: высшим категориям — свои списки */
const rollName = (rarity, seed) => {
  switch (rarity) {
    case 'crown':
      return CROWN_NAMES[seed % CROWN_NAMES.length];
    case 'named':
      return REAL_NAMES[seed % REAL_NAMES.length];
    case 'constellation':
      return generatedName(seed, 5);
    default:
      return generatedName(seed, 0);
  }
};

/* Генерация звезды заданной редкости (детерминированная по seed) */
const generateStar = (seed, rarity) => {
  const rng = mulberry32((seed + RARITIES[rarity].order * 977) * 2654435761 + 1013904223);

  const face = pick(rng, FACES);
  const isFancy = RARITIES[rarity].order >= RARITIES.named.order;
  const decor = isFancy ? pick(rng, FANCY_DECORS) : pick(rng, COMMON_DECORS);

  return {
    /* cartId — стабильный ключ для корзины */
    cartId: `star-${rarity}-${seed}`,
    rarity,
    face,
    decor,
    name: rollName(rarity, seed),
    /* созвездным — своё созвездие без повторов внутри секции */
    constellation:
      rarity === 'constellation'
        ? CONSTELLATIONS[seed % CONSTELLATIONS.length]
        : pick(rng, CONSTELLATIONS),
    desc: pick(rng, DESCRIPTIONS),
    distance: Math.floor(rng() * 900 + 40),
    price: rollPrice(rarity, rng),
  };
};

/* ===== Светила: Солнце и Луна — задаются вручную, с кастомными карточками ===== */
const LUMINARIES = [
  {
    cartId: 'star-luminary-sun',
    rarity: 'luminary',
    variant: 'sun',
    face: 'joy',
    decor: 'none',
    name: 'Солнце',
    system: 'Солнечная система',
    desc: 'греет всё живое и ничего не просит взамен',
    metaText: '8 световых минут от вас',
    price: 24990,
  },
  {
    cartId: 'star-luminary-moon',
    rarity: 'luminary',
    variant: 'moon',
    face: 'sleepy',
    decor: 'none',
    name: 'Луна',
    system: 'Солнечная система',
    desc: 'ведёт счёт приливам и снам',
    metaText: '1,3 световой секунды от вас',
    price: 19990,
  },
];

/* Текстовые бейджи без значков; безымянным бейдж не нужен */
const RARITY_LABEL = Object.fromEntries(
  Object.values(RARITIES)
    .filter((r) => r.id !== 'nameless')
    .map((r) => [r.id, r.label])
);

/* ===== План каталога: секции по редкости, от высшей к обычной =====
   Светила заданы вручную, остальные секции генерируются по количеству */
const SECTION_ORDER = ['crown', 'luminary', 'named', 'constellation', 'nameless'];
const SECTION_SIZES = { crown: 3, named: 12, constellation: 12, nameless: 16 };

const buildSections = () =>
  SECTION_ORDER.map((rarityId) => ({
    id: rarityId,
    stars:
      rarityId === 'luminary'
        ? LUMINARIES
        : Array.from({ length: SECTION_SIZES[rarityId] }, (_, i) =>
            generateStar(i, rarityId)
          ),
  }));

const StarsPage = () => {
  const navigate = useNavigate();
  const { addItem, items: cartItems } = useCart();

  const [toast, setToast] = useState(null);
  const [gifted, setGifted] = useState(() => 114 + new Date().getHours() * 3);

  const toastTimer = useRef(null);

  /* каталог собирается один раз — генератор детерминированный */
  const sections = useMemo(buildSections, []);
  const totalStars = sections.reduce((sum, s) => sum + s.stars.length, 0);

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

  /* Плавный переход к секции редкости */
  const scrollToSection = (rarityId) => {
    document
      .getElementById(`rarity-${rarityId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            Небо разложено по редкостям — от Небесного Венца до безымянных
            звёзд. Чем выше категория, тем меньше таких на небе.
          </p>
          <div className="catalog-counter">
            <span className="counter-dot"></span>
            сегодня подарили {gifted} звёзд
          </div>
        </section>

        {/* Быстрый переход по категориям */}
        <div className="catalog-filters">
          {SECTION_ORDER.map((rarityId) => (
            <button
              key={rarityId}
              className="filter-chip"
              onClick={() => scrollToSection(rarityId)}
            >
              {RARITIES[rarityId].label}
            </button>
          ))}
        </div>

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
              <p className="rarity-section-tagline">
                {RARITIES[sec.id].groupTagline}
              </p>
            </div>
            <div className={`catalog-grid ${sec.id === 'luminary' ? 'luminary-grid' : ''}`}>
              {sec.stars.map((star) => renderStarCard(star))}
            </div>
          </section>
        ))}

        <div className="catalog-end">
          <div className="catalog-end-line"></div>
          <p className="catalog-end-title">На сегодня это всё небо</p>
          <p className="catalog-end-sub">
            {totalStars} звёзд — от Небесного Венца до безымянных. Какая-то из
            них уже смотрит на вас в ответ.
          </p>
        </div>
      </main>

      {toast && <div className="sky-toast">{toast}</div>}

      <Footer />
    </div>
  );
};

export default StarsPage;
