// ═══════════════════════════════════════════
// sprites.js — Image-based vehicle renderer
// Uses real PNG assets extracted from game art
// ═══════════════════════════════════════════

const Sprites = (() => {
  // Preloaded Image objects
  const imgs = {};
  let loaded = 0, total = 0;

  const VEHICLE_ASSET_MAP = {
    sports:    { persp: 'car_player_persp', topdown: 'car_player_topdown' },
    red:       { persp: 'car_red',          topdown: 'car_red' },
    white:     { persp: 'car_white',        topdown: 'car_white' },
    suv:       { persp: 'car_suv',          topdown: 'car_suv' },
    black:     { persp: 'car_black',        topdown: 'car_black' },
    pickup:    { persp: 'car_pickup',       topdown: 'car_pickup' },
    truck:     { persp: 'car_truck',        topdown: 'car_truck' },
  };

  function preload(cb) {
    const keys = Object.keys(Assets);
    total = keys.length;
    if (total === 0) { cb(); return; }
    keys.forEach(k => {
      const img = new Image();
      img.onload  = () => { loaded++; if (loaded >= total) cb(); };
      img.onerror = () => { loaded++; if (loaded >= total) cb(); };
      img.src = Assets[k];
      imgs[k] = img;
    });
  }

  function getImg(key) { return imgs[key] || null; }

  // Draw an image centred at (0,0), scaled to fit w×h, respecting aspect
  function drawImg(ctx, key, w, h, flipX) {
    const img = getImg(key);
    if (!img || !img.complete || img.naturalWidth === 0) {
      // Fallback coloured box
      ctx.fillStyle = 'rgba(180,100,255,0.5)';
      ctx.fillRect(-w/2, -h/2, w, h);
      return;
    }
    const aspect = img.naturalWidth / img.naturalHeight;
    let dw = w, dh = h;
    // Fit inside bounds preserving aspect
    if (dw / dh > aspect) dw = dh * aspect;
    else                   dh = dw / aspect;

    ctx.save();
    if (flipX) { ctx.scale(-1, 1); }
    ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
    ctx.restore();
  }

  // ── TRAFFIC VEHICLE TYPES ─────────────────
  const TRAFFIC_TYPES = [
    { type: 'red',    assetKey: 'car_red',    w: 52, h: 88,  speedMult: 0.55 },
    { type: 'white',  assetKey: 'car_white',  w: 52, h: 88,  speedMult: 0.50 },
    { type: 'suv',    assetKey: 'car_suv',    w: 56, h: 94,  speedMult: 0.42 },
    { type: 'black',  assetKey: 'car_black',  w: 50, h: 86,  speedMult: 0.48 },
    { type: 'pickup', assetKey: 'car_pickup', w: 54, h: 100, speedMult: 0.38 },
    { type: 'truck',  assetKey: 'car_truck',  w: 62, h: 138, speedMult: 0.22 },
  ];

  // Draw player car
  function drawPlayer(ctx, x, y, w, h, driftAngle, camMode) {
    ctx.save();
    ctx.translate(x, y);
    if (driftAngle) ctx.rotate(driftAngle * 0.25);
    const key = camMode === 'topdown' ? 'car_player_topdown' : 'car_player_persp';
    drawImg(ctx, key, w, h, false);
    ctx.restore();
  }

  // Draw a traffic vehicle
  function drawTraffic(ctx, x, y, w, h, assetKey, scale) {
    ctx.save();
    ctx.translate(x, y);
    if (scale && scale !== 1) ctx.scale(scale, scale);
    drawImg(ctx, assetKey, w, h, false);
    ctx.restore();
  }

  const DIMS = {
    sports: { w: 56, h: 100 },
    red:    { w: 52, h: 88 },
    white:  { w: 52, h: 88 },
    suv:    { w: 56, h: 94 },
    black:  { w: 50, h: 86 },
    pickup: { w: 54, h: 100 },
    truck:  { w: 62, h: 138 },
  };

  return { preload, getImg, drawPlayer, drawTraffic, TRAFFIC_TYPES, DIMS };
})();
