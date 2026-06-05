// ═══════════════════════════════════════════
// road.js — Road rendering (highway + topdown)
// ═══════════════════════════════════════════

const Road = (() => {
  // ── shared state ───────────────────────────
  let W, H;
  let offset = 0;          // scrolling offset
  let bgOffset = 0;
  let frameCount = 0;

  // ── constants ──────────────────────────────
  const LANE_COUNT = 4;
  const HORIZON_Y  = () => H * 0.40;
  const ROAD_L_TOP = () => W * 0.5 - 60;   // perspective road top-left
  const ROAD_R_TOP = () => W * 0.5 + 60;
  const ROAD_L_BOT = () => W * 0.08;
  const ROAD_R_BOT = () => W * 0.92;

  // Top-down
  const TD_ROAD_L  = () => W * 0.18;
  const TD_ROAD_R  = () => W * 0.82;
  const TD_ROAD_W  = () => TD_ROAD_R() - TD_ROAD_L();
  const TD_LANE_W  = () => TD_ROAD_W() / LANE_COUNT;

  // ── star field ─────────────────────────────
  let stars = [];
  function initStars() {
    stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        s: Math.random() * 1.6 + 0.3,
        b: Math.random(),
        sp: Math.random() * 0.003 + 0.001,
      });
    }
  }

  // ── city buildings ─────────────────────────
  let buildings = [];
  function initBuildings() {
    buildings = [];
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 14; i++) {
        const bw = 0.035 + Math.random() * 0.045;
        buildings.push({
          side,
          x: side === 0
            ? Math.random() * 0.13 + 0.01
            : Math.random() * 0.13 + 0.86,
          bw,
          bh: 0.14 + Math.random() * 0.28,
          baseY: 0.60 + Math.random() * 0.40,
          hue: Math.random() > 0.5 ? 270 : 195,
          windows: buildWindows(bw),
        });
      }
    }
  }

  function buildWindows(bw) {
    const wins = [];
    const cols = Math.round(bw * 180);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < cols; c++) {
        wins.push({ r, c, on: Math.random() > 0.35, phase: Math.random() * Math.PI * 2 });
      }
    }
    return wins;
  }

  // ── update ─────────────────────────────────
  function update(speed) {
    offset   = (offset + speed) % 1000;
    bgOffset = (bgOffset + speed * 0.18) % H;
    frameCount++;
    stars.forEach(s => { s.b = (Math.sin(frameCount * s.sp * 60 + s.phase) + 1) * 0.5; });
  }
  // attach phase to stars after init
  function postInitStars() { stars.forEach(s => s.phase = Math.random() * Math.PI * 2); }

  // ── sky + stars ─────────────────────────────
  function drawSky(ctx, maxY) {
    const sky = ctx.createLinearGradient(0, 0, 0, maxY);
    sky.addColorStop(0,   '#030010');
    sky.addColorStop(0.7, '#0e0024');
    sky.addColorStop(1,   '#180038');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, maxY);

    stars.forEach(s => {
      const alpha = 0.2 + s.b * 0.7;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * maxY * 0.9, s.s * (0.5 + s.b * 0.5), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── city silhouette ─────────────────────────
  function drawBuildings(ctx, maxY) {
    buildings.forEach(b => {
      const bx = b.x * W;
      const bw = b.bw * W;
      const bh = b.bh * maxY;
      const by = maxY - bh;

      // Building body
      ctx.fillStyle = '#090012';
      ctx.fillRect(bx - bw / 2, by, bw, bh);

      // Windows
      const wCols = Math.max(1, Math.round(bw / 9));
      const wRows = Math.max(1, Math.round(bh / 14));
      const wPadX = bw * 0.12, wPadY = 8;
      const wW = (bw - wPadX * 2) / wCols;
      const wH = (bh - wPadY * 2) / wRows;

      b.windows.forEach((win, idx) => {
        if (!win.on) return;
        const col = idx % wCols;
        const row = Math.floor(idx / wCols);
        if (row >= wRows) return;
        const wx = bx - bw / 2 + wPadX + col * wW + 1;
        const wy = by + wPadY + row * wH + 1;
        const ww = wW - 2, wh = wH - 2;
        if (ww < 1 || wh < 1) return;
        const flicker = Math.sin(win.phase + frameCount * 0.015) > -0.95 ? 1 : 0;
        if (!flicker) return;
        ctx.fillStyle = b.hue === 270
          ? `rgba(190,150,255,0.7)`
          : `rgba(120,220,255,0.65)`;
        ctx.shadowBlur = 3; ctx.shadowColor = b.hue === 270 ? '#a855f7' : '#38bdf8';
        ctx.fillRect(wx, wy, ww, wh);
      });
      ctx.shadowBlur = 0;

      // Rooftop accent
      ctx.strokeStyle = `hsla(${b.hue},70%,60%,0.4)`;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 5; ctx.shadowColor = `hsla(${b.hue},70%,60%,1)`;
      ctx.beginPath();
      ctx.moveTo(bx - bw / 2, by);
      ctx.lineTo(bx + bw / 2, by);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }

  // ═══════════════════════════════════════════
  // HIGHWAY MODE
  // ═══════════════════════════════════════════

  function drawHighway(ctx, w, h, speed) {
    W = w; H = h;

    const HY = HORIZON_Y();
    const RLT = ROAD_L_TOP(), RRT = ROAD_R_TOP();
    const RLB = ROAD_L_BOT(), RRB = ROAD_R_BOT();

    drawSky(ctx, HY);
    drawBuildings(ctx, HY + 4);

    // ── Road surface ───────────────────────────
    const roadGrad = ctx.createLinearGradient(W / 2, HY, W / 2, H);
    roadGrad.addColorStop(0,   '#0c0c10');
    roadGrad.addColorStop(0.5, '#101014');
    roadGrad.addColorStop(1,   '#141418');
    ctx.fillStyle = roadGrad;
    ctx.beginPath();
    ctx.moveTo(RLT, HY); ctx.lineTo(RRT, HY);
    ctx.lineTo(RRB, H);  ctx.lineTo(RLB, H);
    ctx.closePath(); ctx.fill();

    // Road reflection / wet sheen
    const reflGrad = ctx.createLinearGradient(W/2, HY, W/2, H);
    reflGrad.addColorStop(0, 'rgba(138,43,226,0)');
    reflGrad.addColorStop(0.55, 'rgba(138,43,226,0.05)');
    reflGrad.addColorStop(1, 'rgba(0,229,255,0.07)');
    ctx.fillStyle = reflGrad;
    ctx.beginPath();
    ctx.moveTo(RLT, HY); ctx.lineTo(RRT, HY);
    ctx.lineTo(RRB, H);  ctx.lineTo(RLB, H);
    ctx.closePath(); ctx.fill();

    // ── Road edge barriers ─────────────────────
    const barrL = ctx.createLinearGradient(0, HY, 0, H);
    barrL.addColorStop(0, 'rgba(255,45,120,0)');
    barrL.addColorStop(1, 'rgba(255,45,120,0.25)');
    ctx.strokeStyle = barrL; ctx.lineWidth = 3;
    ctx.shadowBlur = 10; ctx.shadowColor = '#ff2d78';
    ctx.beginPath(); ctx.moveTo(RLT, HY); ctx.lineTo(RLB, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(RRT, HY); ctx.lineTo(RRB, H); ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Lane dividers (perspective dashed lines) ──
    for (let l = 1; l < LANE_COUNT; l++) {
      const frac = l / LANE_COUNT;
      const bx = RLT + (RRT - RLT) * frac;
      const tx = RLB + (RRB - RLB) * frac;

      // Draw individual dashes
      const dashCount = 16;
      for (let d = 0; d < dashCount; d++) {
        const t0 = ((d / dashCount) + offset / 400) % 1;
        const t1 = t0 + 0.028;
        if (t1 > 1) continue;

        const x0 = bx + (tx - bx) * t0,  y0 = HY + (H - HY) * t0;
        const x1 = bx + (tx - bx) * t1,  y1 = HY + (H - HY) * t1;
        const alpha = Utils.clamp(t0 * 1.6, 0, 0.55);
        const lw    = t0 * 2.5 + 0.5;

        ctx.strokeStyle = `rgba(255,210,50,${alpha})`;
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }

    // ── Horizon glow ───────────────────────────
    const hg = ctx.createRadialGradient(W/2, HY, 0, W/2, HY, W * 0.5);
    hg.addColorStop(0, 'rgba(157,78,221,0.18)');
    hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg; ctx.fillRect(0, HY - 30, W, 60);
  }

  // ═══════════════════════════════════════════
  // TOP-DOWN MODE
  // ═══════════════════════════════════════════

  function drawTopDown(ctx, w, h, speed) {
    W = w; H = h;

    // Dark background
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, W, H);

    // Sidewalk / dirt strips
    const sideGradL = ctx.createLinearGradient(0, 0, TD_ROAD_L(), 0);
    sideGradL.addColorStop(0, '#04000e');
    sideGradL.addColorStop(1, '#0a0018');
    ctx.fillStyle = sideGradL;
    ctx.fillRect(0, 0, TD_ROAD_L(), H);

    const sideGradR = ctx.createLinearGradient(TD_ROAD_R(), 0, W, 0);
    sideGradR.addColorStop(0, '#0a0018');
    sideGradR.addColorStop(1, '#04000e');
    ctx.fillStyle = sideGradR;
    ctx.fillRect(TD_ROAD_R(), 0, W - TD_ROAD_R(), H);

    // Stars in side strips
    stars.forEach(s => {
      const alpha = 0.1 + s.b * 0.4;
      const sx = s.x < 0.5
        ? s.x * TD_ROAD_L() * 1.8
        : TD_ROAD_R() + (s.x - 0.5) * (W - TD_ROAD_R()) * 1.8;
      const sy = (s.y * H + bgOffset) % H;
      ctx.fillStyle = `rgba(200,180,255,${alpha})`;
      ctx.beginPath(); ctx.arc(sx, sy, s.s * 0.8, 0, Math.PI * 2); ctx.fill();
    });

    // Road asphalt
    const asphalt = ctx.createLinearGradient(TD_ROAD_L(), 0, TD_ROAD_R(), 0);
    asphalt.addColorStop(0,   '#0f0f14');
    asphalt.addColorStop(0.5, '#121216');
    asphalt.addColorStop(1,   '#0f0f14');
    ctx.fillStyle = asphalt;
    ctx.fillRect(TD_ROAD_L(), 0, TD_ROAD_W(), H);

    // Subtle asphalt grain
    ctx.strokeStyle = 'rgba(255,255,255,0.014)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const x = TD_ROAD_L() + TD_ROAD_W() * (i / 6);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    // Centre reflection strip
    const cx = (TD_ROAD_L() + TD_ROAD_R()) / 2;
    const cg = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
    cg.addColorStop(0, 'transparent');
    cg.addColorStop(0.5, 'rgba(138,43,226,0.07)');
    cg.addColorStop(1, 'transparent');
    ctx.fillStyle = cg; ctx.fillRect(cx - 8, 0, 16, H);

    // Road edge neon
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ff2d78';
    ctx.shadowBlur = 14; ctx.shadowColor = '#ff2d78';
    ctx.beginPath(); ctx.moveTo(TD_ROAD_L(), 0); ctx.lineTo(TD_ROAD_L(), H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(TD_ROAD_R(), 0); ctx.lineTo(TD_ROAD_R(), H); ctx.stroke();
    ctx.shadowBlur = 0;

    // Lane dividers
    const dashLen = 44, dashGap = 22;
    const total = dashLen + dashGap;
    const off = offset % total;
    ctx.strokeStyle = 'rgba(255,200,40,0.4)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([dashLen, dashGap]);
    ctx.lineDashOffset = -off;
    for (let l = 1; l < LANE_COUNT; l++) {
      const lx = TD_ROAD_L() + l * TD_LANE_W();
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }

  // ── Public helpers for traffic to use ───────

  function getLaneX_topdown(lane) {
    return TD_ROAD_L() + (lane + 0.5) * TD_LANE_W();
  }

  // Convert a traffic vehicle's "normalised" lane/y to screen coords (highway)
  function highwayCarPos(lane, normY) {
    const frac = (lane + 0.5) / LANE_COUNT;
    const RLT = ROAD_L_TOP(), RRT = ROAD_R_TOP();
    const RLB = ROAD_L_BOT(), RRB = ROAD_R_BOT();
    const HY  = HORIZON_Y();

    const bx = RLT + (RRT - RLT) * frac;
    const tx = RLB + (RRB - RLB) * frac;
    const x  = bx + (tx - bx) * normY;
    const y  = HY + (H - HY) * normY;
    const scale = 0.18 + normY * 0.9;
    return { x, y, scale };
  }

  function getHorizonY()   { return HORIZON_Y(); }
  function getLaneCount()  { return LANE_COUNT; }
  function getTdLaneX(l)   { return getLaneX_topdown(l); }
  function getTdRoadL()    { return TD_ROAD_L(); }
  function getTdRoadR()    { return TD_ROAD_R(); }

  return {
    update,
    drawHighway, drawTopDown,
    initStars, postInitStars, initBuildings,
    getHorizonY, getLaneCount,
    highwayCarPos,
    getTdLaneX, getTdRoadL, getTdRoadR,
  };
})();
