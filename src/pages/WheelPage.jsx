import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { WHEEL_TIERS, PITY_TARGET, spin, fetchReel, fetchPity } from '../data/wheel';
import {
  TOKEN_PACKS,
  getBalance,
  buyTokens,
  spendToken,
  ticketWord,
} from '../data/tokens';
import '../style/index.css';
import '../style/Stars.css';
import '../style/Wheel.css';

/* ===== Геометрия ленты ===== */
const CARD_W = 150;      // ширина карточки, px
const GAP = 10;          // зазор между карточками, px
const STEP = CARD_W + GAP;

/* ===== Тайминги ===== */
const SPIN_MS = 6200;    // прокрутка
const REVEAL_MS = 700;   // пауза перед показом модалки

const WheelPage = () => {
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0);
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [transition, setTransition] = useState('none');
  const [spinning, setSpinning] = useState(false);
  const [landedKey, setLandedKey] = useState(null);
  const [modal, setModal] = useState(null);
  const [pity, setPity] = useState({ current: 0, target: PITY_TARGET });

  const viewportRef = useRef(null);
  const timers = useRef([]);

  useEffect(() => {
    setBalance(getBalance());
    fetchReel().then(setItems);
    fetchPity().then(setPity);
    const onChange = (e) => setBalance(e.detail);
    window.addEventListener('tokens:change', onChange);
    const pending = timers.current;
    return () => {
      window.removeEventListener('tokens:change', onChange);
      pending.forEach(clearTimeout);
    };
  }, []);

  const handleSpin = async () => {
    if (spinning) return;
    if (getBalance() < 1) {
      setModal({ type: 'noTickets' });
      return;
    }

    spendToken(1);
    setBalance((b) => b - 1);
    setSpinning(true);
    setLandedKey(null);

    /* результат целиком приходит «с сервера»: лента, индекс, приз, гарант */
    const res = await spin();
    setItems(res.reel);
    setPity(res.pity);
    setTransition('none');
    setOffset(0);

    /* два кадра, чтобы сброс успел отрисоваться до запуска анимации */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const vw = viewportRef.current?.offsetWidth || 0;
        /* при near-miss смещаемся в сторону светила — оно замирает впритык */
        const jitter =
          res.nearMiss === 'left'
            ? -CARD_W * 0.38
            : res.nearMiss === 'right'
              ? CARD_W * 0.38
              : (Math.random() - 0.5) * (CARD_W * 0.5);
        const target = res.winIndex * STEP + CARD_W / 2 - vw / 2 + jitter;

        setTransition(`transform ${SPIN_MS}ms cubic-bezier(0.08, 0.72, 0.06, 1)`);
        setOffset(-target);

        timers.current.push(
          setTimeout(() => {
            setSpinning(false);
            setLandedKey(`w-${res.winIndex}`);

            timers.current.push(
              setTimeout(() => {
                setModal({
                  type: res.prize.tier === 'crown' ? 'legendary' : 'star',
                  prize: res.prize,
                  guaranteed: res.guaranteed,
                });
              }, REVEAL_MS)
            );
          }, SPIN_MS + 40)
        );
      });
    });
  };

  const handleBuy = async (pack) => {
    const next = await buyTokens(pack);
    setBalance(next);
  };

  const left = Math.max(0, pity.target - pity.current);
  const pityPercent = useMemo(
    () => Math.min(100, Math.round((pity.current / pity.target) * 100)),
    [pity]
  );

  const packList = (extraClass = '') => (
    <div className={`ticket-packs ${extraClass}`}>
      {TOKEN_PACKS.slice(0, 3).map((pack) => (
        <button key={pack.id} className="ticket-pack" onClick={() => handleBuy(pack)}>
          <span className="ticket-pack-amount">
            {pack.amount} {ticketWord(pack.amount)}
          </span>
          <span className="ticket-pack-price">
            {pack.price.toLocaleString('ru-RU')} ₽
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="stars-page-wrapper roulette-root">
      <Header />

      <div className="sky-layer far"></div>
      <div className="sky-layer near"></div>
      <div className="shooting-star s1"></div>
      <div className="shooting-star s2"></div>

      <main className="roulette-page">
        <section className="roulette-hero">
          <div className="hero-rule">
            <span className="hero-rule-line"></span>
            <span className="hero-rule-star">✦</span>
            <span className="hero-rule-line"></span>
          </div>
          <h1 className="roulette-title">Рулетка звёзд</h1>
          <p className="roulette-sub">
            Один билет — одно вращение. Звезда, что остановится под меткой,
            станет вашей.
          </p>
        </section>

        {/* ===== Лента ===== */}
        <div className="roulette-box">
          <span className="box-corner tl" aria-hidden="true"></span>
          <span className="box-corner tr" aria-hidden="true"></span>
          <span className="box-corner bl" aria-hidden="true"></span>
          <span className="box-corner br" aria-hidden="true"></span>

          <div className={`roulette-viewport ${spinning ? 'is-spinning' : ''}`} ref={viewportRef}>
            <div className="viewport-stars" aria-hidden="true"></div>
            <div
              className="roulette-track"
              style={{ transform: `translateX(${offset}px)`, transition }}
            >
              {items.map((it) => (
                <article
                  key={it.key}
                  className={`roulette-item rar-${it.tier} ${
                    landedKey === it.key ? 'landed' : ''
                  }`}
                >
                  <span className="item-glow" aria-hidden="true"></span>
                  <div className="roulette-item-visual">
                    <StarAvatar
                      face={it.face}
                      decor={it.decor}
                      size={92}
                      color={it.color}
                      variant={it.variant}
                      image={it.image}
                    />
                  </div>
                  <div className="roulette-item-name">{it.name}</div>
                  <div className="roulette-item-rarity">
                    {WHEEL_TIERS[it.tier].label}
                  </div>
                  <span className="item-bar" aria-hidden="true"></span>
                </article>
              ))}
            </div>

            {/* затемнение по краям и метка по центру */}
            <div className="roulette-fade left" aria-hidden="true"></div>
            <div className="roulette-fade right" aria-hidden="true"></div>
            <div className="marker-beam" aria-hidden="true"></div>
            <div className="roulette-marker" aria-hidden="true"></div>
          </div>

          <div className="roulette-controls">
            <button
              className="roulette-spin"
              onClick={handleSpin}
              disabled={spinning}
            >
              {spinning ? 'Крутится…' : 'Крутить · 1 билет'}
            </button>
            <div className="roulette-balance">
              У вас <strong>{balance}</strong> {ticketWord(balance)}
            </div>
          </div>
        </div>

        {/* ===== Гарант и билеты ===== */}
        <div className="roulette-info">
          <div className="roulette-panel pity-panel">
            <h2 className="roulette-panel-title">Гарант Луны</h2>
            <p className="roulette-panel-hint">
              Луна выпадает гарантированно на {pity.target}-й крутке. Если
              светило попалось раньше — счётчик начинается заново.
            </p>

            <div className="pity-counter">
              <span className="pity-left">{left}</span>
              <span className="pity-left-label">
                {left === 1 ? 'крутка' : left < 5 ? 'крутки' : 'круток'} до Луны
              </span>
            </div>

            <div className="pity-bar">
              <span className="pity-bar-fill" style={{ width: `${pityPercent}%` }}></span>
            </div>
            <div className="pity-scale">
              <span>{pity.current}</span>
              <span>{pity.target}</span>
            </div>
          </div>

          <div className="roulette-panel">
            <h2 className="roulette-panel-title">Билеты</h2>
            <p className="roulette-panel-hint">
              Билеты нужны для вращения рулетки. Один билет — одно вращение.
            </p>
            {packList()}
          </div>
        </div>
      </main>

      {/* ===== Модалки ===== */}
      {modal && (
        <div className="wheel-modal-backdrop" onClick={() => setModal(null)}>
          <div className={`wheel-modal ${modal.type}`} onClick={(e) => e.stopPropagation()}>
            {modal.type === 'noTickets' ? (
              <>
                <h3 className="wheel-modal-title">Не хватает билетов</h3>
                <p className="wheel-modal-text">
                  Чтобы крутить рулетку, нужен хотя бы один билет. Возьмите набор —
                  и звёзды ваши.
                </p>
                {packList('modal-packs')}
                <div className="wheel-modal-balance">
                  Сейчас у вас {balance} {ticketWord(balance)}
                </div>
                <button className="wheel-modal-close" onClick={() => setModal(null)}>
                  {balance > 0 ? 'Готов крутить' : 'Закрыть'}
                </button>
              </>
            ) : (
              <>
                {modal.type === 'legendary' && (
                  <div className="legendary-rays" aria-hidden="true"></div>
                )}
                <div className="wheel-modal-eyebrow">
                  {modal.guaranteed
                    ? 'Гарант сработал'
                    : modal.type === 'legendary'
                      ? 'Легендарная удача'
                      : 'Ваш выигрыш'}
                </div>
                <h3 className="wheel-modal-title">
                  {modal.type === 'legendary'
                    ? 'Вам выпала легендарка!'
                    : 'Вам выпала звезда!'}
                </h3>
                <div className={`wheel-prize ${modal.prize.tier}`}>
                  <div className="wheel-prize-visual">
                    <StarAvatar
                      face={modal.prize.face}
                      decor={modal.prize.decor}
                      size={150}
                      color={modal.prize.color}
                      variant={modal.prize.variant}
                      image={modal.prize.image}
                    />
                  </div>
                  <div className="wheel-prize-name">{modal.prize.name}</div>
                  <div className="wheel-prize-rarity">
                    {WHEEL_TIERS[modal.prize.tier].label}
                  </div>
                </div>
                <div className="wheel-modal-actions">
                  <button
                    className="wheel-modal-close primary"
                    onClick={() => {
                      setModal(null);
                      navigate('/profile');
                    }}
                  >
                    Забрать в кабинет
                  </button>
                  <button className="wheel-modal-close" onClick={() => setModal(null)}>
                    Крутить ещё
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default WheelPage;
