// sprites.js — Image-based vehicle renderer
const Sprites = (() => {
  const imgs = {};
  let loaded = 0, total = 0;

  const TRAFFIC_TYPES = [
    { type:'red',    assetKey:'car_red',    w:52, h:86,  speedMult:0.55 },
    { type:'white',  assetKey:'car_white',  w:52, h:86,  speedMult:0.50 },
    { type:'suv',    assetKey:'car_suv',    w:56, h:92,  speedMult:0.42 },
    { type:'black',  assetKey:'car_black',  w:50, h:86,  speedMult:0.48 },
    { type:'pickup', assetKey:'car_pickup', w:52, h:98,  speedMult:0.38 },
    { type:'truck',  assetKey:'car_truck',  w:60, h:136, speedMult:0.22 },
  ];

  function preload(cb) {
    const keys = Object.keys(Assets);
    total = keys.length;
    if (!total) { cb(); return; }
    keys.forEach(k => {
      const img = new Image();
      img.onload  = () => { if (++loaded >= total) cb(); };
      img.onerror = () => { if (++loaded >= total) cb(); };
      img.src = Assets[k];
      imgs[k] = img;
    });
  }

  function getImg(key) { return imgs[key] || null; }

  function drawImg(ctx, key, w, h) {
    const img = getImg(key);
    if (!img || !img.complete || !img.naturalWidth) {
      ctx.fillStyle = 'rgba(157,78,221,0.4)';
      ctx.fillRect(-w/2, -h/2, w, h);
      return;
    }
    const asp = img.naturalWidth / img.naturalHeight;
    let dw = w, dh = h;
    if (dw / dh > asp) dw = dh * asp;
    else               dh = dw / asp;
    ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
  }

  function drawPlayer(ctx, x, y, w, h, driftAngle, camMode) {
    ctx.save();
    ctx.translate(x, y);
    if (driftAngle) ctx.rotate(driftAngle * 0.22);
    const key = camMode === 'topdown' ? 'car_player_topdown' : 'car_player_persp';
    drawImg(ctx, key, w, h);
    ctx.restore();
  }

  function drawTraffic(ctx, x, y, w, h, assetKey) {
    ctx.save();
    ctx.translate(x, y);
    drawImg(ctx, assetKey, w, h);
    ctx.restore();
  }

  return { preload, getImg, drawPlayer, drawTraffic, TRAFFIC_TYPES };
})();
