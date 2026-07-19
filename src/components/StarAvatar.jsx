import React from 'react';

/**
 * Милая звезда в стиле референса: пухлая пятиконечная звезда
 * с мордочкой и украшениями вокруг.
 *
 * face:  happy | joy | sleepy | wink
 * decor: none | sparkles | ring | orbit | dots | swoosh | beads
 */

const STAR_POINTS =
  '60,24 71.2,46.6 96.1,50.3 78.1,67.9 82.3,92.7 60,81 37.7,92.7 41.9,67.9 23.9,50.3 48.8,46.6';

const INK = '#33291f';
const LINE = '#d9b36a';

const Sparkle = ({ x, y, s = 1, o = 0.9 }) => (
  <path
    d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill="#ffe9a8"
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

const StarAvatar = ({ face = 'happy', decor = 'none', size = 120 }) => {
  const gid = React.useId();

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
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="1" stopColor="#f2c96a" />
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

      {/* сама звезда */}
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

      {/* украшения поверх */}
      {decor === 'sparkles' && (
        <g>
          <Sparkle x="22" y="28" s="0.9" />
          <Sparkle x="99" y="24" s="0.6" o="0.75" />
          <circle cx="103" cy="86" r="2" fill="#ffe9a8" opacity="0.7" />
          <circle cx="16" cy="72" r="1.6" fill="#ffe9a8" opacity="0.55" />
        </g>
      )}
      {decor === 'orbit' && (
        <g>
          <circle cx="15" cy="55" r="3" fill="#e7c27d" />
          <circle cx="105" cy="76" r="3" fill="#e7c27d" />
        </g>
      )}
      {decor === 'beads' && (
        <g>
          <circle cx="60" cy="6" r="2" fill="#ffe9a8" opacity="0.7" />
          <Sparkle x="60" y="15" s="0.7" />
          <circle cx="60" cy="104" r="2.4" fill="#ffe9a8" opacity="0.75" />
          <Sparkle x="60" y="113" s="0.5" o="0.7" />
        </g>
      )}
      {decor === 'ring' && <Sparkle x="100" y="30" s="0.6" o="0.8" />}
    </svg>
  );
};

export default StarAvatar;
