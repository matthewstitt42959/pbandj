// A top-down ship for a chess piece. Each type has its own silhouette so the
// pieces can be told apart at a glance on a phone-sized board:
//   sloop (small, one mast) · frigate (long, two masts) · brig (two slanted yards)
//   ship of the line (broad, three masts) · man-of-war (widest, gun-deck stripes)
//   flagship (three masts and a pennant)

export const AMBER = '#fbbf24';
export const RED = '#f87171';

const HULL = {
  p: { w: 0.5, len: 0.7 },
  n: { w: 0.58, len: 0.92 },
  b: { w: 0.66, len: 0.86 },
  r: { w: 0.82, len: 0.96 },
  q: { w: 1, len: 1 },
  k: { w: 0.88, len: 1 },
};

const YARDS = {
  p: [{ y: 52, w: 34 }],
  n: [{ y: 40, w: 38 }, { y: 64, w: 42 }],
  b: [{ y: 40, w: 42, rot: -26 }, { y: 64, w: 46, rot: -26 }],
  r: [{ y: 30, w: 54 }, { y: 50, w: 62 }, { y: 70, w: 54 }],
  q: [{ y: 28, w: 60 }, { y: 49, w: 72 }, { y: 70, w: 60 }],
  k: [{ y: 28, w: 54 }, { y: 49, w: 62 }, { y: 70, w: 54 }],
};

export default function ShipIcon({ type, color, className = '' }) {
  const side = color === 'w' ? AMBER : RED;
  const h = HULL[type];
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ transform: color === 'w' ? undefined : 'rotate(180deg)' }}
      aria-hidden="true"
    >
      <g transform={`translate(50 52) scale(${h.w} ${h.len}) translate(-50 -52)`}>
        <path
          d="M50 4 C68 24 72 54 67 90 L33 90 C28 54 32 24 50 4 Z"
          fill="#6b4a2b"
          stroke={side}
          strokeWidth={4 / Math.max(h.w, 0.6)}
          strokeLinejoin="round"
        />
        {type === 'q' && (
          <>
            <line x1="40" y1="40" x2="40" y2="82" stroke="#00000055" strokeWidth="2" />
            <line x1="60" y1="40" x2="60" y2="82" stroke="#00000055" strokeWidth="2" />
          </>
        )}
      </g>
      {YARDS[type].map((yd) => (
        <rect
          key={yd.y}
          x={50 - yd.w / 2}
          y={yd.y - 3.5}
          width={yd.w}
          height="7"
          rx="3.5"
          fill="#f5f0e1"
          stroke="#00000066"
          strokeWidth="1"
          transform={yd.rot ? `rotate(${yd.rot} 50 ${yd.y})` : undefined}
        />
      ))}
      {type === 'k' && (
        <>
          <line x1="50" y1="6" x2="50" y2="22" stroke={side} strokeWidth="3" />
          <path d="M50 6 L68 12 L50 18 Z" fill={side} />
        </>
      )}
    </svg>
  );
}
