import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { RARITIES } from '../data/rarities';
import { fetchStar } from '../data/catalog';
import { useCart } from '../context/CartContext';
import '../style/index.css';
import '../style/Stars.css';
import '../style/StarPage.css';

/**
 * ===== Страница звезды =====
 *
 * Открывается кликом по карточке в каталоге: крупный визуал в стиле
 * редкости, «паспорт звезды», история и покупка. Данные приходят из
 * слоя каталога. TODO(backend): fetchStar → GET /api/stars/:id
 */

const StarPage = () => {
  const { cartId } = useParams();
  const navigate = useNavigate();
  const { addItem, items: cartItems } = useCart();

  /* undefined — загрузка; null — не нашли; объект — готово */
  const [data, setData] = useState(undefined);

  useEffect(() => {
    let alive = true;
    setData(undefined);
    fetchStar(cartId).then((res) => {
      if (alive) setData(res);
    });
    window.scrollTo({ top: 0 });
    return () => {
      alive = false;
    };
  }, [cartId]);

  const star = data?.star;
  const inCart = star && cartItems.some((it) => it.cartId === star.cartId);

  /* строки «паспорта звезды»; отсутствующие поля не показываем */
  const passport = star
    ? [
        { label: 'Редкость', value: RARITIES[star.rarity].label },
        {
          label: star.system ? 'Система' : 'Созвездие',
          value: star.system || star.constellation,
        },
        {
          label: 'Расстояние',
          value: star.metaText || `${star.distance} световых лет`,
        },
        { label: 'Звёздная величина', value: star.magnitude },
        { label: 'Спектральный класс', value: star.spectral },
        { label: 'Тип объекта', value: star.objectType || 'звезда' },
      ].filter((row) => row.value)
    : [];

  return (
    <div className="stars-page-wrapper">
      <Header />

      <div className="sky-layer far"></div>
      <div className="sky-layer near"></div>

      <main className="star-page">
        <Link to="/stars" className="star-page-back">
          ← в каталог
        </Link>

        {data === undefined && (
          <div className="catalog-loading">
            <div className="loader-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            наводим телескоп…
          </div>
        )}

        {data === null && (
          <div className="catalog-empty">
            <p className="catalog-end-title">Такой звезды на нашем небе нет</p>
            <p className="catalog-end-sub">
              Возможно, ссылка устарела — но в каталоге двести других.
            </p>
            <button
              className="catalog-reset-button"
              onClick={() => navigate('/stars')}
            >
              Открыть каталог
            </button>
          </div>
        )}

        {star && (
          <>
            <div className="star-page-layout">
              {/* Крупный визуал в стиле редкости карточки */}
              <div
                className={`sky-card star-hero ${star.rarity} ${star.variant || ''}`}
              >
                <span className={`star-badge ${star.rarity}-badge`}>
                  {RARITIES[star.rarity].label}
                </span>
                <div className="star-visual star-hero-visual">
                  <StarAvatar
                    face={star.face}
                    decor={star.decor}
                    size={210}
                    color={star.color}
                    variant={star.variant}
                    image={star.image}
                  />
                </div>
                <div className="star-meta">
                  {star.metaText || `${star.distance} св. лет от вас`}
                </div>
              </div>

              {/* Информация и покупка */}
              <div className="star-page-info">
                <h1 className="star-page-name">{star.name}</h1>
                <div className="star-page-place">
                  {star.system || `созвездие ${star.constellation}`}
                </div>
                <p className="star-page-desc">{star.desc}</p>

                {star.story && <p className="star-page-story">{star.story}</p>}

                {/* Паспорт звезды */}
                <dl className="star-passport">
                  {passport.map((row) => (
                    <div key={row.label} className="star-passport-row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Солнце и Луна не продаются — выпадают только в рулетке */}
                {star.dropOnly ? (
                  <>
                    <div className="star-page-buy">
                      <span className="star-page-droponly">Только в рулетке</span>
                    </div>
                    <p className="star-page-note">
                      Это светило нельзя купить: оно выпадает только в рулетке.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="star-page-buy">
                      <span className="star-page-price">
                        {star.price.toLocaleString('ru-RU')} ₽
                      </span>
                      <button
                        className={`gift-button ${inCart ? 'in-cart' : ''}`}
                        onClick={() =>
                          inCart ? navigate('/cart') : addItem(star)
                        }
                      >
                        {inCart ? 'В корзине' : 'Подарить'}
                      </button>
                    </div>
                    <p className="star-page-note">
                      После оплаты получателю придёт письмо с именем звезды
                      и тёплыми словами от вас.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Соседи той же редкости */}
            {data.similar.length > 0 && (
              <section className="star-neighbours">
                <h2 className="star-neighbours-title">Соседи по небу</h2>
                <div className="star-neighbours-grid">
                  {data.similar.map((s) => (
                    <Link
                      key={s.cartId}
                      to={`/star/${s.cartId}`}
                      className={`sky-card neighbour-card ${s.rarity} ${s.variant || ''}`}
                    >
                      <div className="star-visual">
                        <StarAvatar
                          face={s.face}
                          decor={s.decor}
                          size={90}
                          color={s.color}
                          variant={s.variant}
                          image={s.image}
                        />
                      </div>
                      <h3 className="star-name">{s.name}</h3>
                      <div className="star-constellation">
                        {s.system || `созвездие ${s.constellation}`}
                      </div>
                      {s.dropOnly ? (
                        <span className="star-drop-only">Только в рулетке</span>
                      ) : (
                        <span className="star-price">
                          {s.price.toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default StarPage;
