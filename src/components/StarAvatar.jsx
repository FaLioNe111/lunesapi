import React from 'react';

/**
 * Милая звезда в стиле референса: пухлая пятиконечная звезда
 * с мордочкой и украшениями вокруг.
 *
 * face:    happy | joy | sleepy | wink
 * decor:   none | sparkles | ring | orbit | dots | swoosh | beads
 * color:   ключ палитры (gold, pink, purple, green, orange, cyan, blue, lilac, red, silver)
 * variant: sun | moon — круглые светила вместо звезды
 */

const STAR_POINTS =
  '60,24 71.2,46.6 96.1,50.3 78.1,67.9 82.3,92.7 60,81 37.7,92.7 41.9,67.9 23.9,50.3 48.8,46.6';

const INK = '#33291f';

/* Палитра цветов звёзд: light — блик, deep — тело, line — украшения */
export const STAR_COLORS = {
  gold:   { light: '#ffe9a8', deep: '#f2c96a', line: '#d9b36a' },
  pink:   { light: '#ffd3e2', deep: '#ff9dbe', line: '#f7a8c4' },
  purple: { light: '#e2d0ff', deep: '#bfa0ff', line: '#c8aaff' },
  green:  { light: '#daf5b8', deep: '#aee283', line: '#b7e08c' },
  orange: { light: '#ffd8b0', deep: '#ffa869', line: '#f5b183' },
  cyan:   { light: '#c6f6f2', deep: '#7fe0dc', line: '#93e2de' },
  blue:   { light: '#cfe3ff', deep: '#8fbdff', line: '#9dc6ff' },
  lilac:  { light: '#f0d9ff', deep: '#d9a8ff', line: '#dcb0ff' },
  red:    { light: '#ffc4ac', deep: '#ff8264', line: '#ff9b7d' },
  silver: { light: '#eef4ff', deep: '#c8d8f5', line: '#d5e2fa' },
};

const getPalette = (color) => STAR_COLORS[color] || STAR_COLORS.gold;

const Sparkle = ({ x, y, s = 1, o = 0.9, fill = '#ffe9a8' }) => (
  <path
    d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill={fill}
    opacity={o}
  />
);

const Face = ({ face }) => {
  switch (face) {
    case 'joy':
      return (
        <g>
          <circle cx="48" cy="58" r="3.2" fill={INK} />
          <circle cx="72" cy="58" r="3.2" fill={INK} />
          <path d="M52 67 A8 8 0 0 0 68 67 Z" fill={INK} />
        </g>
      );
    case 'sleepy':
      return (
        <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
          <path d="M43 56 Q48 61 53 56" />
          <path d="M67 56 Q72 61 77 56" />
          <path d="M55 70 Q60 74 65 70" />
        </g>
      );
    case 'wink':
      return (
        <g>
          <circle cx="48" cy="58" r="3" fill={INK} />
          <path
            d="M67 58 Q72 52 77 58"
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M54 69 Q60 75 66 69"
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      );
    case 'happy':
    default:
      return (
        <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
          <path d="M43 58 Q48 52 53 58" />
          <path d="M67 58 Q72 52 77 58" />
          <path d="M54 69 Q60 75 66 69" />
        </g>
      );
  }
};

/* Лучи Солнца: длинные и короткие, по кругу */
const SUN_RAYS = Array.from({ length: 16 }, (_, i) => i * 22.5);

/* ===== Солнце: круглый диск с лучами ===== */
const SunBody = ({ gid, face }) => (
  <g>
    {SUN_RAYS.map((a, i) => (
      <rect
        key={a}
        x="58.5"
        y={i % 2 ? 8 : 2}
        width="3"
        height={i % 2 ? 12 : 18}
        rx="1.5"
        fill="#ffd77a"
        opacity={i % 2 ? 0.65 : 0.9}
        transform={`rotate(${a} 60 60)`}
      />
    ))}
    <circle cx="60" cy="60" r="34" fill={`url(#${gid})`} />
    <circle cx="46" cy="70" r="4.5" fill="#f0a35e" opacity="0.5" />
    <circle cx="74" cy="70" r="4.5" fill="#f0a35e" opacity="0.5" />
    <g transform="translate(0 4)">
      <Face face={face} />
    </g>
  </g>
);

/* ===== Луна: круглый диск с кратерами ===== */
const MoonBody = ({ gid, face }) => (
  <g>
    <circle cx="60" cy="60" r="34" fill={`url(#${gid})`} />
    {/* кратеры */}
    <circle cx="44" cy="48" r="5" fill="#b9c8e6" opacity="0.55" />
    <circle cx="78" cy="52" r="3.5" fill="#b9c8e6" opacity="0.45" />
    <circle cx="72" cy="82" r="4.5" fill="#b9c8e6" opacity="0.4" />
    <circle cx="40" cy="74" r="2.8" fill="#b9c8e6" opacity="0.4" />
    <circle cx="46" cy="70" r="4.5" fill="#a9bde0" opacity="0.45" />
    <circle cx="74" cy="70" r="4.5" fill="#a9bde0" opacity="0.45" />
    <g transform="translate(0 4)">
      <Face face={face} />
    </g>
  </g>
);

const StarAvatar = ({ face = 'happy', decor = 'none', size = 120, color = 'gold', variant = null }) => {
  const gid = React.useId();
  const palette = variant === 'moon' ? STAR_COLORS.silver : getPalette(color);
  const LINE = palette.line;

  /* Солнце и Луна — круглые светила со своими градиентами */
  const isLuminary = variant === 'sun' || variant === 'moon';
  const gradFrom = variant === 'sun' ? '#fff0bd' : palette.light;
  const gradTo = variant === 'sun' ? '#f7b23f' : palette.deep;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="30" y1="20" x2="86" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={gradFrom} />
          <stop offset="1" stopColor={gradTo} />
        </linearGradient>
      </defs>

      {/* украшения позади звезды */}
      {(decor === 'ring' || decor === 'orbit') && (
        <ellipse
          cx="60"
          cy="66"
          rx="53"
          ry="18"
          transform="rotate(-16 60 66)"
          stroke={LINE}
          strokeWidth="2"
          opacity="0.7"
        />
      )}
      {decor === 'dots' && (
        <circle
          cx="60"
          cy="62"
          r="50"
          stroke={LINE}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="0.1 10"
          opacity="0.7"
        />
      )}
      {decor === 'swoosh' && (
        <path
          d="M12 90 Q58 114 110 70"
          stroke={LINE}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
      )}

      {/* тело: круглое светило или пятиконечная звезда */}
      {isLuminary ? (
        variant === 'sun' ? (
          <SunBody gid={gid} face={face} />
        ) : (
          <MoonBody gid={gid} face={face} />
        )
      ) : (
        <>
          <polygon
            points={STAR_POINTS}
            fill={`url(#${gid})`}
            stroke={`url(#${gid})`}
            strokeWidth="12"
            strokeLinejoin="round"
          />

          {/* щёчки */}
          <circle cx="42" cy="66" r="4" fill="#f0a35e" opacity="0.55" />
          <circle cx="78" cy="66" r="4" fill="#f0a35e" opacity="0.55" />

          <Face face={face} />
        </>
      )}

      {/* украшения поверх */}
      {decor === 'sparkles' && (
        <g>
          <Sparkle x="22" y="28" s="0.9" fill={palette.light} />
          <Sparkle x="99" y="24" s="0.6" o="0.75" fill={palette.light} />
          <circle cx="103" cy="86" r="2" fill={palette.light} opacity="0.7" />
          <circle cx="16" cy="72" r="1.6" fill={palette.light} opacity="0.55" />
        </g>
      )}
      {decor === 'orbit' && (
        <g>
          <circle cx="15" cy="55" r="3" fill={LINE} />
          <circle cx="105" cy="76" r="3" fill={LINE} />
        </g>
      )}
      {decor === 'beads' && (
        <g>
          <circle cx="60" cy="6" r="2" fill={palette.light} opacity="0.7" />
          <Sparkle x="60" y="15" s="0.7" fill={palette.light} />
          <circle cx="60" cy="104" r="2.4" fill={palette.light} opacity="0.75" />
          <Sparkle x="60" y="113" s="0.5" o="0.7" fill={palette.light} />
        </g>
      )}
      {decor === 'ring' && <Sparkle x="100" y="30" s="0.6" o="0.8" fill={palette.light} />}
    </svg>
  );
};

export default StarAvatar;
