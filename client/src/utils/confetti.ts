const CONFETTI_COLORS = [
  '#2e7f7b', '#1a5e5b', '#4ade80', '#86efac',
  '#34d399', '#6ee7b7', '#166534', '#a7f3d0',
  '#059669', '#6ee7b7',
]

export const generateConfetti = (count = 24) =>
  Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
    left: `${(i * 3.25 + (i % 5) * 1.1) % 100}%`,
    delay: `${(i * 0.1) % 1.4}s`,
    dur: `${2.2 + (i % 6) * 0.3}s`,
    w: `${6 + (i % 4) * 3}px`,
    h: `${8 + (i % 3) * 5}px`,
    rot: `${(i * 53) % 360}deg`,
  }))
