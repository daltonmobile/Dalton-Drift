// ═══════════════════════════════════════════
// utils.js — Math helpers & shared constants
// ═══════════════════════════════════════════

const Utils = (() => {
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function randRange(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(randRange(min, max + 1)); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t) { return t * t * t; }

  // Deep colour helpers
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }
  function rgba(hex, a) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }
  function lighten(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    return `rgb(${clamp(r + amount, 0, 255)},${clamp(g + amount, 0, 255)},${clamp(b + amount, 0, 255)})`;
  }
  function darken(hex, amount) { return lighten(hex, -amount); }

  return { lerp, clamp, randRange, randInt, easeOut, easeIn, hexToRgb, rgba, lighten, darken };
})();
