// dashboard.js — in-car dashboard camera view
// Uses real dashboard background images from assets
// Draws a perspective road view through the windshield
// with animated traffic, speed, and analog gauges overlaid

const Dashboard = (() => {
  // Which dashboard image to use — matches player's selected car
  const DASH_MAP = {
    purple: 'dashboard_supercar',
    blue:   'dashboard_sports1',
    red:    'dashboard_muscle',
    silver: 'dashboard_luxury1',
    teal:   'dashboard_sports2',
    black:  'dashboard_coupe',
    gold:   'dashboard_luxury2',
    orange: 'dashboard_sports1',
  };

  let frameCount = 0;
  // Subtle steering wheel angle
  let wheelAngle = 0;

  function update(driftAngle) {
    frameCount++;
    wheelAngle = Utils.lerp(wheelAngle, -driftAngle * 8, 0.12);
  }

  function draw(ctx, W, H, speed, maxSpeed, nitro, distance, traffic, Road, offset) {
    // ── 1. Dashboard background image ────────────────────────
    const color = Sprites.getPlayerColor();
    const dashKey = DASH_MAP[color] || 'dashboard_sports1';
    const dashImg = Sprites.getImg(dashKey);

    if (dashImg && dashImg.complete && dashImg.naturalWidth) {
      // Fill entire screen with dashboard image
      const iAsp = dashImg.naturalWidth / dashImg.naturalHeight;
      const sAsp = W / H;
      let dw, dh, dx, dy;
      if (iAsp > sAsp) { dh=H; dw=H*iAsp; dx=(W-dw)/2; dy=0; }
      else             { dw=W; dh=W/iAsp; dx=0; dy=(H-dh)/2; }
      ctx.drawImage(dashImg, dx, dy, dw, dh);
    } else {
      // Fallback dark interior
      ctx.fillStyle = '#0a0008';
      ctx.fillRect(0, 0, W, H);
    }

    // ── 2. Windshield area — perspective road ─────────────────
    // Windshield occupies roughly top 52% of screen
    const windTop    = H * 0.02;
    const windBottom = H * 0.52;
    const windLeft   = W * 0.04;
    const windRight  = W * 0.96;
    const windW      = windRight - windLeft;
    const windH      = windBottom - windTop;

    ctx.save();
    ctx.beginPath();
    // Slightly curved windshield shape
    ctx.moveTo(windLeft,  windTop + windH * 0.08);
    ctx.quadraticCurveTo(W * 0.5, windTop - windH * 0.04, windRight, windTop + windH * 0.08);
    ctx.lineTo(windRight, windBottom);
    ctx.lineTo(windLeft,  windBottom);
    ctx.closePath();
    ctx.clip();

    // Sky in windshield
    const sky = ctx.createLinearGradient(0, windTop, 0, windBottom * 0.5);
    sky.addColorStop(0, '#020010');
    sky.addColorStop(1, '#12003a');
    ctx.fillStyle = sky;
    ctx.fillRect(windLeft, windTop, windW, windH);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 60; i++) {
      const sx = windLeft + ((i * 137.5) % windW);
      const sy = windTop  + ((i * 97.3)  % (windH * 0.45));
      ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI*2); ctx.fill();
    }

    // Road in perspective inside windshield
    const vpX = W * 0.5, vpY = windBottom * 0.52;
    const roadL = windLeft + windW * 0.01;
    const roadR = windRight - windW * 0.01;

    const rg = ctx.createLinearGradient(vpX, vpY, vpX, windBottom);
    rg.addColorStop(0, '#0c0c12');
    rg.addColorStop(1, '#141418');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(vpX - 36, vpY);
    ctx.lineTo(vpX + 36, vpY);
    ctx.lineTo(roadR, windBottom);
    ctx.lineTo(roadL, windBottom);
    ctx.closePath(); ctx.fill();

    // Road wet reflection
    const wr = ctx.createLinearGradient(vpX, vpY, vpX, windBottom);
    wr.addColorStop(0, 'rgba(100,0,180,0)');
    wr.addColorStop(1, 'rgba(0,200,255,0.07)');
    ctx.fillStyle = wr;
    ctx.beginPath();
    ctx.moveTo(vpX-36,vpY); ctx.lineTo(vpX+36,vpY);
    ctx.lineTo(roadR,windBottom); ctx.lineTo(roadL,windBottom);
    ctx.closePath(); ctx.fill();

    // Lane lines
    const laneCount = 4;
    for (let l = 1; l < laneCount; l++) {
      const frac = l / laneCount;
      const bx = vpX + (frac - 0.5) * 72;
      const tx = roadL + (roadR - roadL) * frac;
      const dashCount = 14;
      for (let d = 0; d < dashCount; d++) {
        const t0 = ((d / dashCount) + offset / 350) % 1;
        const t1 = t0 + 0.03;
        if (t1 > 1) continue;
        const x0=bx+(tx-bx)*t0, y0=vpY+(windBottom-vpY)*t0;
        const x1=bx+(tx-bx)*t1, y1=vpY+(windBottom-vpY)*t1;
        ctx.strokeStyle = `rgba(255,210,50,${(t0*0.55).toFixed(2)})`;
        ctx.lineWidth = t0 * 2.5 + 0.5;
        ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
      }
    }

    // Road edge glow lines
    ctx.strokeStyle = 'rgba(255,45,120,0.35)';
    ctx.lineWidth = 2; ctx.shadowBlur = 8; ctx.shadowColor = '#ff2d78';
    ctx.beginPath(); ctx.moveTo(vpX-36,vpY); ctx.lineTo(roadL,windBottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vpX+36,vpY); ctx.lineTo(roadR,windBottom); ctx.stroke();
    ctx.shadowBlur = 0;

    // Traffic vehicles visible through windshield
    if (traffic) {
      const sorted = [...traffic].sort((a,b) => a.normY - b.normY);
      sorted.forEach(v => {
        if (v.normY < 0.05 || v.normY > 0.88) return;
        const frac = (v.lane + 0.5) / laneCount;
        const bx = vpX + (frac - 0.5) * 72;
        const tx = roadL + (roadR - roadL) * frac;
        const vx = bx + (tx - bx) * v.normY;
        const vy = vpY + (windBottom - vpY) * v.normY;
        const sc = 0.12 + v.normY * 0.65;
        const vw = v.w * sc, vh = v.h * sc;
        Sprites.drawTraffic(ctx, vx, vy, vw, vh, v.key);
      });
    }

    // City skyline glow at horizon
    const hg = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, windW * 0.4);
    hg.addColorStop(0, 'rgba(157,78,221,0.22)');
    hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg;
    ctx.fillRect(windLeft, windTop, windW, windH * 0.6);

    ctx.restore(); // end windshield clip

    // ── 3. Windshield glare / reflections ────────────────────
    const glare = ctx.createLinearGradient(windLeft, windTop, windRight, windBottom * 0.3);
    glare.addColorStop(0, 'rgba(255,255,255,0.04)');
    glare.addColorStop(0.4, 'rgba(255,255,255,0.01)');
    glare.addColorStop(1, 'transparent');
    ctx.fillStyle = glare;
    ctx.beginPath();
    ctx.moveTo(windLeft, windTop + windH*0.08);
    ctx.quadraticCurveTo(W*0.5, windTop - windH*0.04, windRight, windTop + windH*0.08);
    ctx.lineTo(windRight, windBottom);
    ctx.lineTo(windLeft, windBottom);
    ctx.closePath(); ctx.fill();

    // ── 4. Analog speedometer overlay (bottom-left) ──────────
    const spdX = W * 0.22, spdY = H * 0.80, spdR = Math.min(W * 0.14, 58);
    drawGauge(ctx, spdX, spdY, spdR, speed, maxSpeed, '#00e5ff', 'km/h');

    // ── 5. RPM gauge (bottom-right) ──────────────────────────
    const rpmVal = Math.min(8000, speed * 320 + (nitro < 0.8 ? 0 : 1200));
    const rpmX = W * 0.78, rpmY = H * 0.80;
    drawGauge(ctx, rpmX, rpmY, spdR, rpmVal, 8000, '#ff2d78', 'RPM');

    // ── 6. Digital speed readout ─────────────────────────────
    ctx.font = `bold ${Math.round(spdR * 0.7)}px 'Orbitron'`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00e5ff';
    ctx.shadowBlur = 14; ctx.shadowColor = '#00e5ff';
    ctx.fillText(Math.round(speed * 6), spdX, spdY + spdR * 0.22);
    ctx.shadowBlur = 0;
    ctx.font = `${Math.round(spdR * 0.28)}px 'Barlow Condensed'`;
    ctx.fillStyle = 'rgba(0,229,255,0.6)';
    ctx.fillText('km/h', spdX, spdY + spdR * 0.45);

    // ── 7. Nitro indicator ───────────────────────────────────
    const nw = W * 0.28, nh = 7;
    const nx = W/2 - nw/2, ny = H * 0.70;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 3); ctx.fill();
    const ng = ctx.createLinearGradient(nx, ny, nx+nw, ny);
    ng.addColorStop(0, '#7c3aed'); ng.addColorStop(1, '#00e5ff');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.roundRect(nx, ny, nw*nitro, nh, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(0,229,255,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 3); ctx.stroke();
    ctx.font = `bold 8px 'Orbitron'`;
    ctx.fillStyle = 'rgba(167,139,250,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('NITRO', W/2, ny - 4);

    // Gear
    const gear = Math.min(6, Math.floor(speed / 2.8) + 1);
    ctx.font = `bold ${Math.round(spdR * 0.55)}px 'Orbitron'`;
    ctx.fillStyle = '#fbbf24';
    ctx.shadowBlur = 12; ctx.shadowColor = '#fbbf24';
    ctx.fillText(gear, W/2, H * 0.78);
    ctx.shadowBlur = 0;
    ctx.font = `8px 'Orbitron'`;
    ctx.fillStyle = 'rgba(251,191,36,0.6)';
    ctx.fillText('GEAR', W/2, H * 0.78 + 12);
    ctx.textAlign = 'left';
  }

  function drawGauge(ctx, cx, cy, r, val, max, color, label) {
    const startA = Math.PI * 0.75, endA = Math.PI * 2.25;
    const pct   = Math.min(1, val / max);
    const angle = startA + pct * (endA - startA);

    // Outer ring
    ctx.strokeStyle = 'rgba(20,0,40,0.85)';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();

    // Background arc
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = r * 0.11;
    ctx.beginPath(); ctx.arc(cx, cy, r*0.82, startA, endA); ctx.stroke();

    // Value arc
    ctx.strokeStyle = color;
    ctx.lineWidth = r * 0.11;
    ctx.shadowBlur = 8; ctx.shadowColor = color;
    ctx.beginPath(); ctx.arc(cx, cy, r*0.82, startA, angle); ctx.stroke();
    ctx.shadowBlur = 0;

    // Tick marks
    for (let i=0; i<=8; i++) {
      const a = startA + (i/8)*(endA-startA);
      const inner = i%2===0 ? r*0.64 : r*0.70;
      ctx.strokeStyle = i%2===0 ? 'rgba(255,255,255,0.55)':'rgba(255,255,255,0.2)';
      ctx.lineWidth = i%2===0 ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(cx+inner*Math.cos(a), cy+inner*Math.sin(a));
      ctx.lineTo(cx+r*0.78*Math.cos(a), cy+r*0.78*Math.sin(a));
      ctx.stroke();
    }

    // Needle
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.shadowBlur = 10; ctx.shadowColor = color;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(r*0.68, 0); ctx.stroke();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-r*0.18, 0); ctx.stroke();
    ctx.restore();

    // Centre dot
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 6; ctx.shadowColor = color;
    ctx.beginPath(); ctx.arc(cx, cy, r*0.07, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  return { draw, update };
})();
