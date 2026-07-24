import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import {
  WHEEL_TIERS,
  WHEEL_TIER_ORDER,
  rollWheel,
  makePrize,
  recordWin,
} from '../data/wheel';
import {
  TOKEN_PACKS,
  getBalance,
  buyTokens,
  spendToken,
  ticketWord,
} from '../data/tokens';
import segmentsImg from '../assets/wheel/segments.webp';
import frameImg from '../assets/wheel/frame.webp';
import pointerImg from '../assets/wheel/pointer.webp';
import '../style/index.css';
import '../style/Stars.css';
import '../style/Wheel.css';

/* ===== Тайминги анимации ===== */
const WINDUP_MS = 850;   // Солнце и Луна уходят из вертикали в горизонталь
const PAUSE_MS = 200;    // короткая пауза перед раскруткой
const SPIN_MS = 4800;    // сам прокрут
const TURNS = 6;         // полных оборотов

/* ===== Иконки легенды ===== */
const LegendIcon = ({ tier }) => {
  const t = WHEEL_TIERS[tier];
  if (tier === 'crown') {
    return (
      <svg viewBox="0 0 40 40" className="legend-icon-svg">
        <g transform="translate(20 20)">
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="-1" y="-16" width="2" height="6" rx="1" fill={t.color} transform={`rotate(${i * 30})`} />
          ))}
          <circle r="9" fill={t.color} />
          <circle cx="-3" cy="-1" r="1.3" fill="#2a1e08" />
          <circle cx="3" cy="-1" r="1.3" fill="#2a1e08" />
          <path d="M-3 3 A4 4 0 0 0 3 3" fill="none" stroke="#2a1e08" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      </svg>
    );
  }
  if (tier === 'distant') {
    return (
      <svg viewBox="0 0 40 40" className="legend-icon-svg">
        <path transform="translate(20 20)" d="M0,-13 L2.6,-2.6 L13,0 L2.6,2.6 L0,13 L-2.6,2.6 L-13,0 L-2.6,-2.6 Z" fill={t.color} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className="legend-icon-svg">
      <g transform="translate(20 20)">
        <ellipse rx="16" ry="5.5" fill="none" stroke={t.color} strokeWidth="2" transform="rotate(-22)" />
        <circle r="8.5" fill={t.color} />
        <circle r="8.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      </g>
    </svg>
  );
};

const WheelPage = () => {
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | windup | spin
  const [modal, setModal] = useState(null);

  const rotationRef = useRef(0);
  const timers = useRef([]);

  useEffect(() => {
    setBalance(getBalance());
    const onChange = (e) => setBalance(e.detail);
    window.addEventListener('tokens:change', onChange);
    const pending = timers.current;
    return () => {
      window.removeEventListener('tokens:change', onChange);
      pending.forEach(clearTimeout);
    };
  }, []);

  const spinning = phase !== 'idle';

  const rotorTransition =
    phase === 'windup'
      ? `transform ${WINDUP_MS}ms cubic-bezier(0.45, 0, 0.9, 0.55)`
      : phase === 'spin'
        ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.7, 0.08, 1)`
        : 'none';

  const handleSpin = () => {
    if (spinning) return;
    if (getBalance() < 1) {
      setModal({ type: 'noTickets' });
      return;
    }

    spendToken(1);
    setBalance((b) => b - 1);

    const cell = rollWheel();
    const R = rotationRef.current;

    /* Фаза 1 — Солнце и Луна из вертикали в горизонталь */
    let delta = (((90 - (R % 180)) % 180) + 180) % 180;
    if (delta < 20) delta += 180;
    const Rw = R + delta;
    setPhase('windup');
    setRotation(Rw);
    rotationRef.current = Rw;

    /* Фаза 2 — прокрут до выигрышной ячейки под указателем */
    timers.current.push(
      setTimeout(() => {
        const base = Rw + TURNS * 360;
        const landing = (((-cell.angle - base) % 360) + 360) % 360;
        const Rf = base + landing;
        setPhase('spin');
        setRotation(Rf);
        rotationRef.current = Rf;

        timers.current.push(
          setTimeout(() => {
            setPhase('idle');
            const prize = makePrize(cell);
            recordWin(prize);
            setModal({
              type: cell.tier === 'crown' ? 'legendary' : 'star',
              prize,
            });
          }, SPIN_MS + 60)
        );
      }, WINDUP_MS + PAUSE_MS)
    );
  };

  const handleBuy = async (pack) => {
    const next = await buyTokens(pack);
    setBalance(next);
  };

  const packList = (extraClass = '') => (
    <div className={`wheel-packs ${extraClass}`}>
      {TOKEN_PACKS.slice(0, 3).map((pack, i) => (
        <button key={pack.id} className="wheel-pack" onClick={() => handleBuy(pack)}>
          <span className={`stub-wrap stack-${i}`}>
            <Ticket stub />
          </span>
          <span className="wheel-pack-label">
            {pack.amount} {ticketWord(pack.amount).toUpperCase()}
          </span>
          <span className="wheel-pack-price">{pack.price.toLocaleString('ru-RU')} ₽</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="stars-page-wrapper wheel-root">
      <Header />

      <main className="wheel-page">
        <section className="wheel-hero">
          <h1 className="wheel-title">
            <span className="ttl-spark">✦</span> Колесо звёзд{' '}
            <span className="ttl-spark">✦</span>
          </h1>
          <p className="wheel-sub">
            Крутите колесо и открывайте звёзды разных редкостей!
          </p>
        </section>

        {/* ===== Колесо ===== */}
        <div className="wheel-stage">
          <div className="wheel-frame">
            <div
              className="wheel-rotor"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: rotorTransition,
              }}
            >
              <img src={segmentsImg} alt="" className="wheel-layer" draggable={false} />
              <img src={frameImg} alt="" className="wheel-layer" draggable={false} />
            </div>
            <img src={pointerImg} alt="" className="wheel-pointer-img" draggable={false} />
          </div>

          <button className="wheel-spin-button" onClick={handleSpin} disabled={spinning}>
            {spinning ? 'Крутится…' : 'Крутить · 1 билет'}
          </button>
          <div className="wheel-balance">
            У вас <strong>{balance}</strong> {ticketWord(balance)}
          </div>
        </div>

        {/* ===== Нижний блок: редкости · билеты · наборы ===== */}
        <div className="wheel-info">
          <div className="wheel-legend">
            {WHEEL_TIER_ORDER.map((t) => {
              const tier = WHEEL_TIERS[t];
              return (
                <div key={t} className="legend-row">
                  <span className="legend-badge" style={{ boxShadow: `0 0 16px ${tier.glow}` }}>
                    <LegendIcon tier={t} />
                  </span>
                  <span className="legend-text">
                    <span className="legend-label">{tier.label}</span>
                    <span className="legend-count">{tier.cells} ячеек</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="wheel-tickets">
            <div className="wheel-tickets-copy">
              <h2 className="wheel-panel-title">
                <span className="ttl-spark small">✦</span> Билеты{' '}
                <span className="ttl-spark small">✦</span>
              </h2>
              <p className="wheel-tickets-hint">
                Билеты нужны для вращения колеса звёзд.
              </p>
            </div>
            <Ticket plaque />
          </div>

          {packList()}
        </div>

        <div className="wheel-rule-banner">1 БИЛЕТ = 1 ВРАЩЕНИЕ</div>
      </main>

      {/* ===== Модалки ===== */}
      {modal && (
        <div className="wheel-modal-backdrop" onClick={() => setModal(null)}>
          <div className={`wheel-modal ${modal.type}`} onClick={(e) => e.stopPropagation()}>
            {modal.type === 'noTickets' ? (
              <>
                <h3 className="wheel-modal-title">Не хватает билетов</h3>
                <p className="wheel-modal-text">
                  Чтобы крутить колесо, нужен хотя бы один билет. Возьмите набор —
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
                {modal.type === 'legendary' && <div className="legendary-rays" aria-hidden="true"></div>}
                <div className="wheel-modal-eyebrow">
                  {modal.type === 'legendary' ? 'Легендарная удача' : 'Ваш выигрыш'}
                </div>
                <h3 className="wheel-modal-title">
                  {modal.type === 'legendary' ? 'Вам выпала легендарка!' : 'Вам выпала звезда!'}
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
                  <div className="wheel-prize-rarity">{WHEEL_TIERS[modal.prize.tier].label}</div>
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

/* ===== Билет (плашка «на вращение» или отрывной корешок) ===== */
const Ticket = ({ plaque = false, stub = false }) => (
  <span className={`ticket ${plaque ? 'ticket-plaque' : ''} ${stub ? 'ticket-stub' : ''}`}>
    {stub && <span className="ticket-perf"></span>}
    <span className="ticket-inner">
      {plaque && <span className="ticket-top">Билет</span>}
      <svg className="ticket-star" viewBox="0 0 120 120" aria-hidden="true">
        <polygon
          points="60,16 75,52 113,55 83,79 92,116 60,95 28,116 37,79 7,55 45,52"
          fill="#f3d488"
          stroke="#e0a94e"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      {plaque && <span className="ticket-bottom">на вращение</span>}
    </span>
  </span>
);

export default WheelPage;
