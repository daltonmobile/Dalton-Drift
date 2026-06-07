// utils.js
const Utils = (() => {
  const lerp      = (a, b, t) => a + (b - a) * t;
  const clamp     = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const randRange = (a, b) => a + Math.random() * (b - a);
  const easeIn    = t => t * t * t;
  const easeOut   = t => 1 - Math.pow(1 - t, 3);
  return { lerp, clamp, randRange, easeIn, easeOut };
})();
