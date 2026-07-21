import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { RARITIES } from '../data/rarities';
import { fetchStar } from '../data/catalog';
import '../style/index.css';
import '../style/Stars.css';
import '../style/GiftPage.css';

/**
 * ===== Страница получения подарка =====
 *
 * Её открывает получатель по ссылке из личного кабинета дарителя:
 *   /gift/:cartId?to=Имя&from=Даритель&m=Пожелание
 *
 * Церемония в три акта: intro (запечатанный подарок) → opening
 * (звёзды спускаются) → revealed (звезда и послание).
 *
 * TODO(backend): вместо параметров в URL — короткий id подарка,
 *                по которому сервер отдаёт звезду, имена и текст.
 */

const BURST_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];

const GiftPage = () => {
  const { cartId } = useParams();
  const [searchParams] = useSearchParams();

  /* данные подарка из ссылки */
  const to = searchParams.get('to') || '';
  const from = searchParams.get('from') || '';
  const message = searchParams.get('m') || '';

  /* undefined — загрузка; null — не нашли; объект — готово */
  const [data, setData] = useState(undefined);
  /* акт церемонии: intro → opening → revealed */
  const [stage, setStage] = useState('intro');

  useEffect(() => {
    let alive = true;
    fetchStar(cartId).then((res) => {
      if (alive) setData(res);
    });
    return () => {
      alive = false;
    };
  }, [cartId]);

  const star = data?.star;

  /* Открытие подарка: пауза на «спуск звёзд», затем раскрытие */
  const openGift = () => {
    if (stage !== 'intro') return;
    setStage('opening');
    setTimeout(() => setStage('revealed'), 2000);
  };

  return (
    <div className="stars-page-wrapper">
      <Header />

      <div className="sky-layer far"></div>
      <div className="sky-layer near"></div>
      <div className="shooting-star s1"></div>
      <div className="shooting-star s2"></div>
      <div className="shooting-star s3"></div>

      <main className="gift-page">
        {data === undefined && (
          <div className="catalog-loading">
            <div className="loader-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            разворачиваем небо…
          </div>
        )}

        {data === null && (
          <div className="catalog-empty">
            <p className="catalog-end-title">Подарок не нашёлся</p>
            <p className="catalog-end-sub">
              Возможно, ссылка неполная — попросите отправителя скопировать
              её ещё раз из личного кабинета.
            </p>
            <Link to="/stars" className="catalog-reset-button">
              Посмотреть каталог
            </Link>
          </div>
        )}

        {star && stage !== 'revealed' && (
          /* ===== Акты 1–2: запечатанный подарок ===== */
          <div className={`gift-stage ${stage}`}>
            <button
              type="button"
              className="gift-orb"
              onClick={openGift}
              aria-label="Открыть подарок"
            >
              <span className="gift-orb-core"></span>
              <span className="gift-orb-ring"></span>
              <span className="gift-orb-spark s1"></span>
              <span className="gift-orb-spark s2"></span>
              <span className="gift-orb-spark s3"></span>
            </button>

            {stage === 'intro' ? (
              <>
                <h1 className="gift-title">
                  {to ? `${to}, для вас есть подарок` : 'Для вас есть подарок'}
                </h1>
                <p className="gift-sub">
                  {from ? `От ${from} · ` : ''}доставлено прямо с ночного неба
                </p>
                <button className="gift-open-button" onClick={openGift}>
                  Открыть
                </button>
              </>
            ) : (
              <>
                <h1 className="gift-title">Звёзды спускаются…</h1>
                <p className="gift-sub">одна из них — теперь ваша</p>
              </>
            )}
          </div>
        )}

        {star && stage === 'revealed' && (
          /* ===== Акт 3: звезда и послание ===== */
          <div className="gift-reveal">
            <div className="gift-burst" aria-hidden="true">
              {BURST_ANGLES.map((a) => (
                <span key={a} style={{ '--a': `${a}deg` }} />
              ))}
            </div>

            <div
              className={`sky-card gift-card ${star.rarity} ${star.variant || ''}`}
            >
              <span className={`star-badge ${star.rarity}-badge`}>
                {RARITIES[star.rarity].label}
              </span>
              <div className="star-visual gift-card-visual">
                <StarAvatar
                  face={star.face}
                  decor={star.decor}
                  size={150}
                  color={star.color}
                  variant={star.variant}
                  image={star.image}
                />
              </div>
              <h2 className="star-name">{star.name}</h2>
              <div className="star-constellation">
                {star.system || `созвездие ${star.constellation}`}
              </div>
              <p className="star-desc">{star.desc}</p>
              <div className="star-meta">
                {star.metaText || `${star.distance} св. лет от вас`}
              </div>
            </div>

            <h1 className="gift-title">
              {to ? `${to}, теперь это ваша звезда` : 'Теперь это ваша звезда'}
            </h1>

            {message && (
              <blockquote className="gift-message">
                «{message}»
                {from && <footer className="gift-message-from">— {from}</footer>}
              </blockquote>
            )}
            {!message && from && (
              <p className="gift-sub">с теплом, {from}</p>
            )}

            <div className="gift-actions">
              <Link to={`/star/${star.cartId}`} className="gift-open-button">
                Узнать всё о звезде
              </Link>
              <Link to="/stars" className="catalog-reset-button gift-back-action">
                Подарить звезду в ответ
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default GiftPage;
