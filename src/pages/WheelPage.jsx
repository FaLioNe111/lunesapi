import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StarAvatar from '../components/StarAvatar';
import { starImage } from '../data/starImages';
import {
  WHEEL_CELLS,
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
import '../style/index.css';
import '../style/Stars.css';
import '../style/Wheel.css';

/* ===== Геометрия колеса ===== */
const VB = 600;
const C = VB / 2;
const R_SEG = 258;         // внешний радиус цветных сегментов
const R_HUB = 84;          // радиус ступицы
const R_ICON = 196;        // радиус кольца иконок
const SECTOR = 360 / WHEEL_CELLS.length; // 7.2°

/* ===== Тайминги ===== */
const WINDUP_MS = 850;
const PAUSE_MS = 200;
const SPIN_MS = 4800;
const TURNS = 6;

const pt = (deg, r) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};

const sectorPath = (i) => {
  const a0 = i * SECTOR - SECTOR / 2;
  const a1 = i * SECTOR + SECTOR / 2;
  const [x0, y0] = pt(a0, R_SEG);
  const [x1, y1] = pt(a1, R_SEG);
  return `M ${C} ${C} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R_SEG} ${R_SEG} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
};

/* ===== Глифы-заглушки для «посадочных мест» ===== */
const GLYPHS = ['spark', 'star', 'saturn', 'dots', 'star', 'spark', 'saturn'];

const Glyph = ({ kind }) => {
  switch (kind) {
    case 'star':
      return (
        <path
          d="M0,-12 L3,-3.7 L12,-3.7 L4.7,1.4 L7.4,9.7 L0,4.6 L-7.4,9.7 L-4.7,1.4 L-12,-3.7 L-3,-3.7 Z"
          fill="#eaf2ff"
        />
      );
    case 'saturn':
      return (
        <g>
          <ellipse rx="13" ry="4.6" fill="none" stroke="#dbe7ff" strokeWidth="1.6" transform="rotate(-22)" opacity="0.9" />
          <circle r="7.2" fill="#eaf2ff" />
        </g>
      );
    case 'dots':
      return (
        <g fill="#eaf2ff" stroke="#dbe7ff" strokeWidth="1">
          <line x1="-8" y1="-5" x2="2" y2="-9" opacity="0.6" />
          <line x1="2" y1="-9" x2="9" y2="4" opacity="0.6" />
          <line x1="9" y1="4" x2="-8" y2="-5" opacity="0.6" />
          <circle cx="-8" cy="-5" r="2.4" />
          <circle cx="2" cy="-9" r="2.4" />
          <circle cx="9" cy="4" r="2.4" />
        </g>
      );
    case 'spark':
    default:
      return (
        <path
          d="M0,-13 L2.6,-2.6 L13,0 L2.6,2.6 L0,13 L-2.6,2.6 L-13,0 L-2.6,-2.6 Z"
          fill="#eaf2ff"
        />
      );
  }
};

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
  // guiding / constellation — планета с кольцом
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
  const [phase, setPhase] = useState('idle');
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

    /* Фаза 2 — прокрут до выигрышной ячейки */
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
          <div className="wheel-pointer" aria-hidden="true"></div>

          <div className="wheel-frame">
            <svg viewBox={`0 0 ${VB} ${VB}`} className="wheel-svg">
              <defs>
                {WHEEL_TIER_ORDER.map((t) => (
                  <linearGradient key={t} id={`seg-${t}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={WHEEL_TIERS[t].color} />
                    <stop offset="100%" stopColor={WHEEL_TIERS[t].color2} />
                  </linearGradient>
                ))}
                <radialGradient id="wheel-depth" cx="50%" cy="46%" r="60%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
                  <stop offset="55%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(4,8,25,0.5)" />
                </radialGradient>
                <radialGradient id="icon-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
                  <stop offset="60%" stopColor="rgba(200,220,255,0.25)" />
                  <stop offset="100%" stopColor="rgba(200,220,255,0)" />
                </radialGradient>
                <radialGradient id="lum-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,236,170,0.9)" />
                  <stop offset="100%" stopColor="rgba(255,236,170,0)" />
                </radialGradient>
              </defs>

              {/* вращающаяся часть */}
              <g
                className="wheel-rotor"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: '50% 50%',
                  transformBox: 'fill-box',
                  transition: rotorTransition,
                }}
              >
                {/* сегменты */}
                {WHEEL_CELLS.map((cell) => (
                  <path
                    key={`s-${cell.index}`}
                    d={sectorPath(cell.index)}
                    fill={`url(#seg-${cell.tier})`}
                  />
                ))}

                {/* глубина/свечение поверх заливки */}
                <circle cx={C} cy={C} r={R_SEG} fill="url(#wheel-depth)" />

                {/* золотые спицы между ячейками */}
                {WHEEL_CELLS.map((cell) => {
                  const a = cell.index * SECTOR + SECTOR / 2;
                  const [xi, yi] = pt(a, R_HUB);
                  const [xo, yo] = pt(a, R_SEG);
                  return (
                    <line
                      key={`sp-${cell.index}`}
                      x1={xi.toFixed(2)}
                      y1={yi.toFixed(2)}
                      x2={xo.toFixed(2)}
                      y2={yo.toFixed(2)}
                      stroke="rgba(243,212,136,0.5)"
                      strokeWidth="1.3"
                    />
                  );
                })}

                {/* иконки-«посадочные места» */}
                {WHEEL_CELLS.map((cell) => {
                  const [ix, iy] = pt(cell.angle, R_ICON);
                  const url = starImage(cell.icon);
                  const isLum = cell.tier === 'crown';
                  return (
                    <g key={`i-${cell.index}`} transform={`translate(${ix.toFixed(2)}, ${iy.toFixed(2)})`}>
                      <circle r={isLum ? 30 : 17} fill={`url(#${isLum ? 'lum-glow' : 'icon-glow'})`} />
                      {url ? (
                        <image href={url} x={isLum ? -26 : -21} y={isLum ? -26 : -21} width={isLum ? 52 : 42} height={isLum ? 52 : 42} />
                      ) : (
                        <g className="cell-glyph">
                          <Glyph kind={GLYPHS[cell.index % GLYPHS.length]} />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* неподвижный обод */}
              <circle cx={C} cy={C} r={R_SEG + 14} fill="none" stroke="#0b1430" strokeWidth="30" />
              <circle cx={C} cy={C} r={R_SEG + 29} fill="none" stroke="#e6c074" strokeWidth="2.5" />
              <circle cx={C} cy={C} r={R_SEG + 1} fill="none" stroke="#e6c074" strokeWidth="2.5" />
              {Array.from({ length: 48 }, (_, i) => {
                const [dx, dy] = pt((i * 360) / 48, R_SEG + 14);
                return <circle key={`d-${i}`} cx={dx} cy={dy} r="2.3" fill="#f3d488" opacity="0.9" />;
              })}

              {/* ступица */}
              <circle cx={C} cy={C} r={R_HUB} fill="#0d1730" stroke="#e6c074" strokeWidth="3.5" />
              <circle cx={C} cy={C} r={R_HUB - 10} fill="none" stroke="rgba(243,212,136,0.4)" strokeWidth="1.5" />
              <path
                d="M0,-34 L10,-10.5 L35,-9.1 L16.5,6.6 L23.2,31 L0,17.5 L-23.2,31 L-16.5,6.6 L-35,-9.1 L-10,-10.5 Z"
                transform={`translate(${C}, ${C})`}
                fill="#f3d488"
                stroke="#e0a94e"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <button className="wheel-spin-button" onClick={handleSpin} disabled={spinning}>
            {spinning ? 'Крутится…' : 'Крутить · 1 билет'}
          </button>
          <div className="wheel-balance">
            У вас <strong>{balance}</strong> {ticketWord(balance)}
          </div>
        </div>

        {/* ===== Нижний блок: легенда · билеты · наборы ===== */}
        <div className="wheel-info">
          {/* Редкости */}
          <div className="wheel-legend">
            {WHEEL_TIER_ORDER.map((t) => {
              const tier = WHEEL_TIERS[t];
              return (
                <div key={t} className="legend-row">
                  <span
                    className="legend-badge"
                    style={{ boxShadow: `0 0 16px ${tier.glow}` }}
                  >
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

          {/* Билеты */}
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

          {/* Наборы */}
          <div className="wheel-packs">
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
                <div className="wheel-packs modal-packs">
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
