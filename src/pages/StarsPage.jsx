import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

/* ===== Фильтры каталога =====
   Сейчас применяются на фронте; при подключении бэкенда те же значения
   уходят параметрами запроса. TODO(backend): fetchCatalog({ search, rarity, sort }) */
const SORT_OPTIONS = [
  { id: 'default', label: 'По редкости' },
  { id: 'asc', label: 'Сначала дешевле' },
  { id: 'desc', label: 'Сначала дороже' },
];

/* Сколько карточек секции показывать сразу; остальное — по «Показать ещё» */
const SECTION_PREVIEW = 24;

const StarsPage = () => {
  const navigate = useNavigate();
  const { addItem, items: cartItems } = useCart();

  /* каталог приходит из слоя данных; null — ещё загружается.
     TODO(backend): при реальном API добавить обработку ошибок загрузки */
  const [sections, setSections] = useState(null);

  const [toast, setToast] = useState(null);
  const [gifted, setGifted] = useState(() => 114 + new Date().getHours() * 3);

  /* раскрытие длинных секций: id секции → сколько карточек показывать */
  const [visibleBySection, setVisibleBySection] = useState({});
  const showMore = (id) =>
    setVisibleBySection((v) => ({
      ...v,
      [id]: (v[id] || SECTION_PREVIEW) + SECTION_PREVIEW,
    }));

  /* Фильтры живут в URL (?q=…&rarity=…&price=…&sort=…) — ссылкой на
     отфильтрованный каталог можно делиться, «назад» работает ожидаемо */
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') || '';
  const rarityFilter = searchParams.get('rarity') || 'all';
  const sortOrder = searchParams.get('sort') || 'default';

  /* значение по умолчанию из URL убираем, чтобы адрес оставался чистым */
  const setFilterParam = (key, value, defaultValue) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const toastTimer = useRef(null);

  const filtersActive =
    search.trim() !== '' ||
    rarityFilter !== 'all' ||
    sortOrder !== 'default';

  const resetFilters = () => {
    setSearchParams({}, { replace: true });
  };

  /* Применение фильтров к каталогу; пустые секции скрываются */
  const shownSections = useMemo(() => {
    if (!sections) return [];
    const q = search.trim().toLowerCase();
    return sections
      .filter((sec) => rarityFilter === 'all' || sec.id === rarityFilter)
      .map((sec) => {
        let stars = sec.stars.filter(
          (s) =>
            !q ||
            s.name.toLowerCase().includes(q) ||
            (s.constellation || '').toLowerCase().includes(q) ||
            (s.system || '').toLowerCase().includes(q)
        );
        /* у Солнца и Луны цены нет — при сортировке считаем её нулевой */
        const priceOf = (s) => s.price || 0;
        if (sortOrder === 'asc') stars = [...stars].sort((a, b) => priceOf(a) - priceOf(b));
        if (sortOrder === 'desc') stars = [...stars].sort((a, b) => priceOf(b) - priceOf(a));
        return { ...sec, stars };
      })
      .filter((sec) => sec.stars.length > 0);
  }, [sections, search, rarityFilter, sortOrder]);

  const foundCount = shownSections.reduce((sum, s) => sum + s.stars.length, 0);

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
        className={`sky-card clickable ${star.rarity} ${star.variant || ''}`}
        onClick={() => navigate(`/star/${star.cartId}`)}
      >
        {RARITY_LABEL[star.rarity] && (
          <span className={`star-badge ${star.rarity}-badge`}>
            {RARITY_LABEL[star.rarity]}
          </span>
        )}
        <div className="star-visual">
          <StarAvatar
            face={star.face}
            decor={star.decor}
            size={126}
            color={star.color}
            variant={star.variant}
          />
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
          {/* Солнце и Луна не продаются — выпадают только в рулетке */}
          {star.dropOnly ? (
            <span className="star-drop-only">Только в рулетке</span>
          ) : (
            <>
              <span className="star-price">{star.price.toLocaleString('ru-RU')} ₽</span>
              <button
                className={`gift-button ${inCart ? 'in-cart' : ''}`}
                onClick={(e) => {
                  /* кнопка не должна открывать страницу звезды */
                  e.stopPropagation();
                  if (inCart) navigate('/cart');
                  else handleGift(star);
                }}
              >
                {inCart ? 'В корзине' : 'Подарить'}
              </button>
            </>
          )}
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

        {/* ===== Панель поиска и фильтров ===== */}
        <div className="catalog-toolbar">
          <input
            className="catalog-search"
            type="search"
            placeholder="Поиск по имени или созвездию…"
            value={search}
            onChange={(e) => setFilterParam('q', e.target.value, '')}
          />
          <select
            className="catalog-select"
            value={sortOrder}
            onChange={(e) => setFilterParam('sort', e.target.value, 'default')}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Чипы редкостей */}
        <div className="catalog-filters">
          <button
            className={`filter-chip ${rarityFilter === 'all' ? 'active' : ''}`}
            onClick={() => setFilterParam('rarity', 'all', 'all')}
          >
            Все
          </button>
          {[...Object.values(RARITIES)]
            .sort((a, b) => b.order - a.order)
            .map((r) => (
              <button
                key={r.id}
                className={`filter-chip ${rarityFilter === r.id ? 'active' : ''}`}
                onClick={() => setFilterParam('rarity', r.id, 'all')}
              >
                {r.label}
              </button>
            ))}
        </div>

        {filtersActive && sections && (
          <div className="catalog-found">
            найдено {foundCount} из {totalStars}
            <button className="catalog-found-reset" onClick={resetFilters}>
              сбросить
            </button>
          </div>
        )}

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
        ) : foundCount === 0 ? (
          /* по фильтрам ничего не нашлось */
          <div className="catalog-empty">
            <p className="catalog-end-title">Таких звёзд сегодня не видно</p>
            <p className="catalog-end-sub">
              Попробуйте смягчить условия — небо большое.
            </p>
            <button className="catalog-reset-button" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <>
            {/* Секции по редкости; длинные раскрываются по «Показать ещё» */}
            {shownSections.map((sec) => {
              const limit = visibleBySection[sec.id] || SECTION_PREVIEW;
              const hiddenCount = sec.stars.length - limit;
              return (
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
                    {sec.stars.slice(0, limit).map((star) => renderStarCard(star))}
                  </div>
                  {hiddenCount > 0 && (
                    <div className="section-more">
                      <button
                        className="catalog-reset-button"
                        onClick={() => showMore(sec.id)}
                      >
                        Показать ещё ({hiddenCount})
                      </button>
                    </div>
                  )}
                </section>
              );
            })}

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
