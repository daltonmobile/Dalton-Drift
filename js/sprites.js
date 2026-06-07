// sprites.js — image-based vehicle renderer
const Sprites = (() => {
  const imgs = {};
  let loaded = 0, total = 0;

  // ── Player car colour → asset mapping ──────────────────────
  const PLAYER_COLORS = ['purple','blue','red','silver','teal','black','gold','orange'];
  let selectedColor = 'purple';
  function setPlayerColor(c) { selectedColor = c; }
  function getPlayerColor()  { return selectedColor; }

  // Map colour to front-view and topdown sprites
  const COLOR_TO_FRONT = {
    purple:'player_front_purple', blue:'player_front_blue',
    red:'player_front_red',       silver:'player_front_silver',
    teal:'player_front_teal',     black:'player_front_black2',
    gold:'player_front_gold',     orange:'player_front_orange',
  };
  const COLOR_TO_TOPDOWN = {
    purple:'player_topdown_purple', blue:'player_topdown_blue',
    red:'player_topdown_red',       silver:'player_topdown_silver',
    teal:'player_topdown_teal',     black:'player_topdown_black',
    gold:'player_topdown_gold',     orange:'player_topdown_orange',
  };

  // ── Traffic vehicle pool ────────────────────────────────────
  // Uses new top-down sprites for top-down mode
  // Uses highway rear-view sprites for highway mode
  const TRAFFIC_TYPES = [
    // Sedans — common
    {key:'traffic_sports_red',    tdKey:'td_sedan_red',    w:96,  h:68,  speed:0.62, cat:'sports'},
    {key:'traffic_sports_blue',   tdKey:'td_sedan_blue',   w:96,  h:68,  speed:0.60, cat:'sports'},
    {key:'traffic_sports_white',  tdKey:'td_sedan_white',  w:96,  h:68,  speed:0.58, cat:'sports'},
    {key:'traffic_sports_black',  tdKey:'td_sedan_black',  w:96,  h:68,  speed:0.63, cat:'sports'},
    {key:'traffic_sports_orange', tdKey:'td_sedan_orange', w:96,  h:68,  speed:0.61, cat:'sports'},
    {key:'traffic_sports_yellow', tdKey:'td_sedan_yellow', w:96,  h:68,  speed:0.64, cat:'sports'},
    {key:'traffic_sports_silver', tdKey:'td_sedan_silver', w:96,  h:68,  speed:0.59, cat:'sports'},
    {key:'traffic_sports_green',  tdKey:'td_sedan_green',  w:96,  h:68,  speed:0.60, cat:'sports'},
    {key:'traffic_sports_purple', tdKey:'td_sedan_grey',   w:96,  h:68,  speed:0.57, cat:'sports'},
    {key:'traffic_sports_grey',   tdKey:'td_sedan_grey2',  w:96,  h:68,  speed:0.58, cat:'sports'},
    {key:'traffic_sports_blue2',  tdKey:'td_sedan_navy',   w:96,  h:68,  speed:0.61, cat:'sports'},
    {key:'traffic_sports_darkred',tdKey:'td_sedan_red2',   w:96,  h:68,  speed:0.59, cat:'sports'},
    // Sedans (varied)
    {key:'traffic_sedan_black',  tdKey:'td_sedan_black2',  w:100, h:72,  speed:0.50, cat:'sedan'},
    {key:'traffic_sedan_silver', tdKey:'td_sedan_beige',   w:100, h:72,  speed:0.48, cat:'sedan'},
    {key:'traffic_sedan_blue',   tdKey:'td_sedan_grey',    w:100, h:72,  speed:0.50, cat:'sedan'},
    {key:'traffic_sedan_grey',   tdKey:'td_sedan_dark',    w:100, h:72,  speed:0.47, cat:'sedan'},
    {key:'traffic_sedan_beige',  tdKey:'td_sedan_beige',   w:100, h:72,  speed:0.46, cat:'sedan'},
    // Special vehicles
    {key:'traffic_sedan_black',  tdKey:'td_police',        w:100, h:72,  speed:0.70, cat:'sedan'},
    {key:'traffic_sedan_silver', tdKey:'td_taxi',          w:100, h:72,  speed:0.65, cat:'sedan'},
    {key:'traffic_sedan_blue',   tdKey:'td_ambulance1',    w:100, h:72,  speed:0.72, cat:'sedan'},
    // SUVs
    {key:'traffic_suv_black',   tdKey:'td_van_white',      w:108, h:78,  speed:0.44, cat:'suv'},
    {key:'traffic_suv_silver',  tdKey:'td_van_grey2',      w:108, h:78,  speed:0.42, cat:'suv'},
    {key:'traffic_suv_red',     tdKey:'td_van_white2',     w:108, h:78,  speed:0.44, cat:'suv'},
    {key:'traffic_suv_grey',    tdKey:'td_van_blue',       w:108, h:78,  speed:0.41, cat:'suv'},
    {key:'traffic_suv_black2',  tdKey:'td_van_white',      w:108, h:78,  speed:0.43, cat:'suv'},
    // Vans & pickups
    {key:'traffic_van_white',   tdKey:'td_van_white2',     w:120, h:82,  speed:0.36, cat:'van'},
    {key:'traffic_van_grey',    tdKey:'td_van_grey2',      w:120, h:82,  speed:0.34, cat:'van'},
    {key:'traffic_pickup_grey', tdKey:'td_truck_yellow',   w:110, h:80,  speed:0.38, cat:'pickup'},
    {key:'traffic_pickup_blue', tdKey:'td_truck_flatbed',  w:110, h:80,  speed:0.39, cat:'pickup'},
    // Large trucks
    {key:'traffic_boxtruck_white',tdKey:'td_container_white', w:138, h:84,  speed:0.28, cat:'truck'},
    {key:'traffic_boxtruck_open', tdKey:'td_container_red',   w:138, h:84,  speed:0.27, cat:'truck'},
    {key:'traffic_semi_red',      tdKey:'td_truck_box_white', w:144, h:86,  speed:0.20, cat:'semi'},
    {key:'traffic_semi_blue',     tdKey:'td_container_blue',  w:144, h:86,  speed:0.20, cat:'semi'},
    {key:'traffic_tanker',        tdKey:'td_tanker_silver',   w:144, h:86,  speed:0.18, cat:'semi'},
    // Buses
    {key:'traffic_schoolbus',   tdKey:'td_bus_yellow',     w:140, h:86,  speed:0.25, cat:'bus'},
    {key:'traffic_bus_white',   tdKey:'td_bus_white',      w:140, h:86,  speed:0.24, cat:'bus'},
    {key:'traffic_bus_blue',    tdKey:'td_bus_blue',       w:140, h:86,  speed:0.23, cat:'bus'},
  ];

  // Weighted spawn by category
  const WEIGHTS = {sports:0.28,sedan:0.22,suv:0.18,van:0.10,pickup:0.09,truck:0.06,semi:0.04,bus:0.03};
  function weightedPick() {
    let r = Math.random(), cum = 0;
    for (const [cat, w] of Object.entries(WEIGHTS)) {
      cum += w;
      if (r <= cum) {
        const pool = TRAFFIC_TYPES.filter(t=>t.cat===cat);
        return pool[Math.floor(Math.random()*pool.length)];
      }
    }
    return TRAFFIC_TYPES[Math.floor(Math.random()*TRAFFIC_TYPES.length)];
  }

  // ── Preload ─────────────────────────────────────────────────
  function preload(cb) {
    const keys = Object.keys(Assets);
    total = keys.length;
    if (!total) { cb(); return; }
    keys.forEach(k => {
      const img = new Image();
      img.onload  = () => { if(++loaded>=total) cb(); };
      img.onerror = () => { if(++loaded>=total) cb(); };
      img.src = Assets[k];
      imgs[k] = img;
    });
  }

  function getImg(key) { return imgs[key] || null; }

  // ── Draw helpers ─────────────────────────────────────────────
  function drawImg(ctx, key, w, h) {
    const img = imgs[key];
    if (!img||!img.complete||!img.naturalWidth) {
      // Invisible fallback — no coloured box
      return;
    }
    const asp = img.naturalWidth/img.naturalHeight;
    let dw=w, dh=h;
    if(dw/dh>asp) dw=dh*asp; else dh=dw/asp;
    // Ensure clean alpha compositing — no white fringe
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img,-dw/2,-dh/2,dw,dh);
    ctx.restore();
  }

  function drawPlayer(ctx, x, y, w, h, driftAngle, camMode) {
    ctx.save();
    ctx.translate(x,y);
    if(driftAngle) ctx.rotate(driftAngle*0.2);
    if(camMode==='topdown') {
      drawImg(ctx, COLOR_TO_TOPDOWN[selectedColor]||'player_topdown_purple', w, h);
    } else {
      // Highway: player is at bottom, show front of car (approaching traffic is behind)
      drawImg(ctx, COLOR_TO_FRONT[selectedColor]||'player_front_purple', w, h);
    }
    ctx.restore();
  }

  function drawTraffic(ctx, x, y, w, h, key, tdKey, camMode) {
    ctx.save();
    ctx.translate(x,y);
    // Use top-down sprite for top-down mode
    const assetKey = (camMode==='topdown' && tdKey) ? tdKey : key;
    drawImg(ctx, assetKey, w, h);
    ctx.restore();
  }

  // Nitro flame effect — draw animated flames behind player
  function drawNitroFlames(ctx, x, y, frameCount) {
    const flameKeys = ['flame_purple_lg','flame_orange_lg','flame_fire_lg','flame_red_lg'];
    const key = flameKeys[Math.floor(frameCount/4) % flameKeys.length];
    const img = imgs[key];
    if(!img||!img.complete||!img.naturalWidth) return;
    ctx.save();
    ctx.globalAlpha = 0.85 + Math.sin(frameCount*0.3)*0.15;
    // Draw two flames at rear wheels
    const fw=28, fh=50;
    ctx.drawImage(img, x-18-fw/2, y+30, fw, fh);
    ctx.drawImage(img, x+18-fw/2, y+30, fw, fh);
    ctx.restore();
  }

  return {
    preload, getImg,
    drawPlayer, drawTraffic, drawNitroFlames,
    weightedPick, TRAFFIC_TYPES,
    setPlayerColor, getPlayerColor, PLAYER_COLORS,
  };
})();
