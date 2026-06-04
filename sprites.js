// ═══════════════════════════════════════════
// sprites.js — Realistic vehicle renderers
//
// Each car type is drawn with:
//  - Accurate silhouette for the vehicle class
//  - Metallic body with gradient shading
//  - Proper window shapes (not just rectangles)
//  - Headlights / taillights with glow
//  - Wheels with tyre detail
//  - Soft shadow underneath
//  - Neon underglow for player car
//
// All functions draw centred at (0,0).
// Call ctx.translate(x,y) before drawing.
// ═══════════════════════════════════════════

const Sprites = (() => {

  // ── shared helpers ─────────────────────────

  function shadow(ctx, w, h, alpha = 0.45) {
    ctx.save();
    ctx.scale(1, 0.35);
    const g = ctx.createRadialGradient(0, h * 0.5 + 4, 0, 0, h * 0.5 + 4, w * 0.55);
    g.addColorStop(0, `rgba(0,0,0,${alpha})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.5 + 4, w * 0.55, w * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function underglow(ctx, w, h, color) {
    const g = ctx.createRadialGradient(0, h * 0.3, 0, 0, h * 0.3, w * 0.7);
    g.addColorStop(0, color.replace(')', ',0.35)').replace('rgb', 'rgba'));
    g.addColorStop(0.6, color.replace(')', ',0.1)').replace('rgb', 'rgba'));
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.3, w * 0.7, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function wheel(ctx, x, y, r, perspective = 1.0) {
    // Tyre (black rubber)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * perspective, 0, 0, Math.PI * 2);
    ctx.fill();
    // Sidewall highlight
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = r * 0.18;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.78, r * 0.78 * perspective, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Rim
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.52, r * 0.52 * perspective, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rim spokes
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r * 0.46, y + Math.sin(a) * r * 0.46 * perspective);
      ctx.stroke();
    }
    // Hub centre
    ctx.fillStyle = '#ccc';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.12, r * 0.12 * perspective, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function headlight(ctx, x, y, w, h, color = '#fff8d0') {
    ctx.fillStyle = color;
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#ffd060';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Lens inner
    ctx.fillStyle = 'rgba(255,255,230,0.5)';
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.55, h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function taillight(ctx, x, y, w, h, lit = true) {
    const bright = lit ? 1 : 0.35;
    ctx.fillStyle = `rgba(220,0,0,${bright})`;
    ctx.shadowBlur = lit ? 12 : 0;
    ctx.shadowColor = '#ff0000';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (lit) {
      ctx.fillStyle = 'rgba(255,80,80,0.5)';
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function glassPanel(ctx, path, isWindshield = false) {
    ctx.fillStyle = isWindshield
      ? 'rgba(140,200,240,0.28)'
      : 'rgba(80,140,180,0.20)';
    ctx.fill(path);
    // Highlight streak
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.8;
    ctx.stroke(path);
  }

  // ── SPORTS COUPE (player + traffic) ────────
  // w=52, h=100 canonical size
  function drawSportsCoupe(ctx, w, h, bodyHex, isPlayer = false, driftAngle = 0, braking = false) {
    const hw = w / 2, hh = h / 2;

    ctx.save();
    if (driftAngle !== 0) ctx.rotate(driftAngle);

    shadow(ctx, w, h);
    if (isPlayer) underglow(ctx, w, h, '#9d4edd');

    // ── Body outer silhouette ──────────────────
    // Sports coupe: low hood, pronounced roof arch, short tail
    const body = new Path2D();
    body.moveTo(-hw + 8, -hh + 2);          // front-left corner
    body.quadraticCurveTo(-hw, -hh + 2, -hw, -hh + 12);  // front fascia curve
    body.lineTo(-hw, -hh + 30);             // front wing
    body.quadraticCurveTo(-hw - 2, -hh + 42, -hw, -hh + 52); // sill step
    body.lineTo(-hw, hh - 18);              // rear door sill
    body.quadraticCurveTo(-hw, hh - 8, -hw + 6, hh - 2); // rear quarter
    body.lineTo(-hw + 14, hh);             // rear bumper start
    body.lineTo(hw - 14, hh);              // rear bumper end
    body.quadraticCurveTo(hw - 6, hh, hw, hh - 2);
    body.lineTo(hw, hh - 18);
    body.quadraticCurveTo(hw + 2, hh - 8, hw, -hh + 52);
    body.lineTo(hw, -hh + 30);
    body.quadraticCurveTo(hw + 2, -hh + 42, hw, -hh + 12);
    body.quadraticCurveTo(hw, -hh + 2, hw - 8, -hh + 2);
    body.lineTo(hw - 22, -hh);             // bonnet front-right
    body.quadraticCurveTo(0, -hh - 2, -hw + 22, -hh); // bonnet nose curve
    body.closePath();

    // Body gradient — metallic paint
    const bg = ctx.createLinearGradient(-hw, -hh, hw, hh);
    const { r, g, b } = Utils.hexToRgb(bodyHex);
    bg.addColorStop(0,   `rgb(${Math.min(r+60,255)},${Math.min(g+60,255)},${Math.min(b+60,255)})`);
    bg.addColorStop(0.25,`rgb(${r},${g},${b})`);
    bg.addColorStop(0.55,`rgb(${Math.max(r-30,0)},${Math.max(g-30,0)},${Math.max(b-30,0)})`);
    bg.addColorStop(0.8, `rgb(${Math.min(r+20,255)},${Math.min(g+20,255)},${Math.min(b+20,255)})`);
    bg.addColorStop(1,   `rgb(${Math.max(r-50,0)},${Math.max(g-50,0)},${Math.max(b-50,0)})`);
    ctx.fillStyle = bg;
    ctx.fill(body);

    // Body edge
    ctx.strokeStyle = `rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},${Math.min(b+80,255)},0.6)`;
    ctx.lineWidth = 0.8;
    ctx.stroke(body);

    // ── Roof ──────────────────────────────────
    const roof = new Path2D();
    roof.moveTo(-hw + 14, -hh + 30);       // A-pillar base L
    roof.quadraticCurveTo(-hw + 12, -hh + 18, -hw + 18, -hh + 12); // A-pillar
    roof.lineTo(-hw + 24, -hh + 8);        // roof front-left
    roof.quadraticCurveTo(0, -hh + 2, hw - 24, -hh + 8); // roof front arc
    roof.lineTo(hw - 18, -hh + 12);
    roof.quadraticCurveTo(hw - 12, -hh + 18, hw - 14, -hh + 30); // A-pillar R
    roof.lineTo(hw - 14, hh - 52);         // C-pillar base R
    roof.quadraticCurveTo(hw - 10, hh - 42, hw - 18, hh - 36); // C-pillar
    roof.lineTo(hw - 28, hh - 32);
    roof.quadraticCurveTo(0, hh - 28, -hw + 28, hh - 32);
    roof.lineTo(-hw + 18, hh - 36);
    roof.quadraticCurveTo(-hw + 10, hh - 42, -hw + 14, hh - 52);
    roof.closePath();

    const rg = ctx.createLinearGradient(0, -hh, 0, -hh + 60);
    rg.addColorStop(0, '#1a0030');
    rg.addColorStop(1, '#0a0014');
    ctx.fillStyle = rg;
    ctx.fill(roof);

    // ── Windshield ─────────────────────────────
    const ws = new Path2D();
    ws.moveTo(-hw + 16, -hh + 30);
    ws.quadraticCurveTo(-hw + 14, -hh + 20, -hw + 20, -hh + 14);
    ws.lineTo(-hw + 26, -hh + 10);
    ws.quadraticCurveTo(0, -hh + 5, hw - 26, -hh + 10);
    ws.lineTo(hw - 20, -hh + 14);
    ws.quadraticCurveTo(hw - 14, -hh + 20, hw - 16, -hh + 30);
    ws.lineTo(-hw + 16, -hh + 30);
    glassPanel(ctx, ws, true);

    // ── Rear window ────────────────────────────
    const rw = new Path2D();
    rw.moveTo(-hw + 17, hh - 34);
    rw.quadraticCurveTo(-hw + 13, hh - 40, -hw + 20, hh - 46);
    rw.lineTo(-hw + 30, hh - 50);
    rw.quadraticCurveTo(0, hh - 54, hw - 30, hh - 50);
    rw.lineTo(hw - 20, hh - 46);
    rw.quadraticCurveTo(hw - 13, hh - 40, hw - 17, hh - 34);
    rw.closePath();
    glassPanel(ctx, rw, false);

    // ── Door windows ───────────────────────────
    const dw1 = new Path2D();
    dw1.moveTo(-hw + 15, -hh + 32);
    dw1.lineTo(-hw + 14, hh - 54);
    dw1.lineTo(-hw + 24, hh - 54);
    dw1.quadraticCurveTo(-hw + 22, -hh + 35, -hw + 20, -hh + 30);
    dw1.closePath();
    glassPanel(ctx, dw1);

    const dw2 = new Path2D();
    dw2.moveTo(hw - 15, -hh + 32);
    dw2.lineTo(hw - 14, hh - 54);
    dw2.lineTo(hw - 24, hh - 54);
    dw2.quadraticCurveTo(hw - 22, -hh + 35, hw - 20, -hh + 30);
    dw2.closePath();
    glassPanel(ctx, dw2);

    // ── Panel lines / character lines ──────────
    ctx.strokeStyle = `rgba(${Math.max(r-40,0)},${Math.max(g-40,0)},${Math.max(b-40,0)},0.7)`;
    ctx.lineWidth = 0.7;
    // Door gap
    ctx.beginPath();
    ctx.moveTo(-hw + 14, -hh + 32);
    ctx.lineTo(-hw + 14, hh - 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hw - 14, -hh + 32);
    ctx.lineTo(hw - 14, hh - 20);
    ctx.stroke();
    // Bonnet crease
    ctx.beginPath();
    ctx.moveTo(-hw + 8, -hh + 4);
    ctx.quadraticCurveTo(-hw + 12, -hh + 8, -hw + 16, -hh + 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hw - 8, -hh + 4);
    ctx.quadraticCurveTo(hw - 12, -hh + 8, hw - 16, -hh + 18);
    ctx.stroke();

    // ── Front bumper / intake ──────────────────
    const bump = ctx.createLinearGradient(0, -hh, 0, -hh + 8);
    bump.addColorStop(0, '#111');
    bump.addColorStop(1, '#222');
    ctx.fillStyle = bump;
    ctx.beginPath();
    ctx.roundRect(-hw + 10, -hh, w - 20, 6, 2);
    ctx.fill();
    // Grille mesh
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const gx = -hw + 14 + i * (w - 28) / 4;
      ctx.beginPath();
      ctx.moveTo(gx, -hh + 1);
      ctx.lineTo(gx, -hh + 5);
      ctx.stroke();
    }

    // ── Headlights ─────────────────────────────
    headlight(ctx, -hw + 12, -hh + 7, 9, 4);
    headlight(ctx, hw - 12, -hh + 7, 9, 4);
    // DRL strip
    ctx.strokeStyle = 'rgba(255,230,130,0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6; ctx.shadowColor = '#ffd060';
    ctx.beginPath();
    ctx.moveTo(-hw + 20, -hh + 3);
    ctx.lineTo(-hw + 8, -hh + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hw - 20, -hh + 3);
    ctx.lineTo(hw - 8, -hh + 3);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Taillights ─────────────────────────────
    taillight(ctx, -hw + 11, hh - 6, 8, 4, true);
    taillight(ctx, hw - 11, hh - 6, 8, 4, braking);
    // LED strip
    ctx.strokeStyle = 'rgba(220,0,0,0.7)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8; ctx.shadowColor = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(-hw + 18, hh - 3);
    ctx.lineTo(-hw + 8, hh - 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hw - 18, hh - 3);
    ctx.lineTo(hw - 8, hh - 3);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Wheels ─────────────────────────────────
    wheel(ctx, -hw + 9, -hh + 28, 10);
    wheel(ctx, hw - 9, -hh + 28, 10);
    wheel(ctx, -hw + 9, hh - 28, 10);
    wheel(ctx, hw - 9, hh - 28, 10);

    // ── Player neon trim ──────────────────────
    if (isPlayer) {
      ctx.strokeStyle = '#9d4edd';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#9d4edd';
      ctx.stroke(body);
      ctx.shadowBlur = 0;
      // Side skirt neon
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 8; ctx.shadowColor = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(-hw + 2, 0);
      ctx.lineTo(-hw + 2, hh - 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hw - 2, 0);
      ctx.lineTo(hw - 2, hh - 22);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // ── SEDAN ───────────────────────────────────
  // w=48, h=92
  function drawSedan(ctx, w, h, bodyHex, braking = false) {
    const hw = w / 2, hh = h / 2;
    ctx.save();
    shadow(ctx, w, h);

    // Body — classic three-box silhouette
    const body = new Path2D();
    body.moveTo(-hw + 6, -hh + 2);
    body.quadraticCurveTo(-hw, -hh + 4, -hw, -hh + 14);
    body.lineTo(-hw, hh - 14);
    body.quadraticCurveTo(-hw, hh - 4, -hw + 6, hh);
    body.lineTo(hw - 6, hh);
    body.quadraticCurveTo(hw, hh - 4, hw, hh - 14);
    body.lineTo(hw, -hh + 14);
    body.quadraticCurveTo(hw, -hh + 4, hw - 6, -hh + 2);
    body.lineTo(hw - 18, -hh);
    body.quadraticCurveTo(0, -hh - 2, -hw + 18, -hh);
    body.closePath();

    const { r, g, b } = Utils.hexToRgb(bodyHex);
    const bg = ctx.createLinearGradient(-hw, -hh, hw * 0.6, hh);
    bg.addColorStop(0,   `rgb(${Math.min(r+50,255)},${Math.min(g+50,255)},${Math.min(b+50,255)})`);
    bg.addColorStop(0.4, `rgb(${r},${g},${b})`);
    bg.addColorStop(1,   `rgb(${Math.max(r-40,0)},${Math.max(g-40,0)},${Math.max(b-40,0)})`);
    ctx.fillStyle = bg;
    ctx.fill(body);
    ctx.strokeStyle = `rgba(${Math.min(r+60,255)},${Math.min(g+60,255)},${Math.min(b+60,255)},0.5)`;
    ctx.lineWidth = 0.7;
    ctx.stroke(body);

    // Roof (sedan-style: relatively upright sides)
    const roof = new Path2D();
    roof.moveTo(-hw + 12, -hh + 28);
    roof.quadraticCurveTo(-hw + 10, -hh + 16, -hw + 17, -hh + 10);
    roof.lineTo(-hw + 22, -hh + 8);
    roof.quadraticCurveTo(0, -hh + 4, hw - 22, -hh + 8);
    roof.lineTo(hw - 17, -hh + 10);
    roof.quadraticCurveTo(hw - 10, -hh + 16, hw - 12, -hh + 28);
    roof.lineTo(hw - 12, hh - 44);
    roof.quadraticCurveTo(hw - 10, hh - 36, hw - 16, hh - 30);
    roof.lineTo(hw - 24, hh - 28);
    roof.quadraticCurveTo(0, hh - 24, -hw + 24, hh - 28);
    roof.lineTo(-hw + 16, hh - 30);
    roof.quadraticCurveTo(-hw + 10, hh - 36, -hw + 12, hh - 44);
    roof.closePath();
    ctx.fillStyle = '#0e0e18';
    ctx.fill(roof);

    // Windshield
    const ws = new Path2D();
    ws.moveTo(-hw + 14, -hh + 28);
    ws.quadraticCurveTo(-hw + 12, -hh + 16, -hw + 18, -hh + 11);
    ws.lineTo(-hw + 24, -hh + 8);
    ws.quadraticCurveTo(0, -hh + 4, hw - 24, -hh + 8);
    ws.lineTo(hw - 18, -hh + 11);
    ws.quadraticCurveTo(hw - 12, -hh + 16, hw - 14, -hh + 28);
    ws.closePath();
    glassPanel(ctx, ws, true);

    const rwp = new Path2D();
    rwp.moveTo(-hw + 14, hh - 46);
    rwp.lineTo(-hw + 18, hh - 32);
    rwp.lineTo(hw - 18, hh - 32);
    rwp.lineTo(hw - 14, hh - 46);
    rwp.closePath();
    glassPanel(ctx, rwp);

    // Headlights
    headlight(ctx, -hw + 10, -hh + 8, 8, 4);
    headlight(ctx, hw - 10, -hh + 8, 8, 4);
    taillight(ctx, -hw + 10, hh - 6, 7, 3, true);
    taillight(ctx, hw - 10, hh - 6, 7, 3, braking);

    // Wheels
    wheel(ctx, -hw + 8, -hh + 24, 9);
    wheel(ctx, hw - 8, -hh + 24, 9);
    wheel(ctx, -hw + 8, hh - 24, 9);
    wheel(ctx, hw - 8, hh - 24, 9);

    ctx.restore();
  }

  // ── SUV ─────────────────────────────────────
  // w=54, h=96
  function drawSUV(ctx, w, h, bodyHex, braking = false) {
    const hw = w / 2, hh = h / 2;
    ctx.save();
    shadow(ctx, w, h, 0.5);

    const { r, g, b } = Utils.hexToRgb(bodyHex);

    // Body — tall, boxy with softened edges
    const body = new Path2D();
    body.moveTo(-hw + 5, -hh + 4);
    body.quadraticCurveTo(-hw, -hh + 4, -hw, -hh + 14);
    body.lineTo(-hw, hh - 14);
    body.quadraticCurveTo(-hw, hh - 2, -hw + 5, hh);
    body.lineTo(hw - 5, hh);
    body.quadraticCurveTo(hw, hh - 2, hw, hh - 14);
    body.lineTo(hw, -hh + 14);
    body.quadraticCurveTo(hw, -hh + 4, hw - 5, -hh + 4);
    body.lineTo(hw - 14, -hh);
    body.quadraticCurveTo(0, -hh - 1, -hw + 14, -hh);
    body.closePath();

    const bg = ctx.createLinearGradient(-hw, -hh, hw * 0.7, hh);
    bg.addColorStop(0,   `rgb(${Math.min(r+55,255)},${Math.min(g+55,255)},${Math.min(b+55,255)})`);
    bg.addColorStop(0.35,`rgb(${r},${g},${b})`);
    bg.addColorStop(0.7, `rgb(${Math.max(r-25,0)},${Math.max(g-25,0)},${Math.max(b-25,0)})`);
    bg.addColorStop(1,   `rgb(${Math.max(r-50,0)},${Math.max(g-50,0)},${Math.max(b-50,0)})`);
    ctx.fillStyle = bg;
    ctx.fill(body);
    ctx.strokeStyle = `rgba(${Math.min(r+70,255)},${Math.min(g+70,255)},${Math.min(b+70,255)},0.45)`;
    ctx.lineWidth = 0.8;
    ctx.stroke(body);

    // Roof (SUVs have very upright pillars)
    ctx.fillStyle = '#141420';
    ctx.beginPath();
    ctx.roundRect(-hw + 10, -hh + 14, w - 20, h * 0.56, 4);
    ctx.fill();

    // Windshield — near-vertical
    const ws = new Path2D();
    ws.moveTo(-hw + 12, -hh + 28);
    ws.lineTo(-hw + 14, -hh + 15);
    ws.lineTo(-hw + 18, -hh + 10);
    ws.quadraticCurveTo(0, -hh + 6, hw - 18, -hh + 10);
    ws.lineTo(hw - 14, -hh + 15);
    ws.lineTo(hw - 12, -hh + 28);
    ws.closePath();
    glassPanel(ctx, ws, true);

    // Side windows
    const sw1 = new Path2D();
    sw1.moveTo(-hw + 11, -hh + 30);
    sw1.lineTo(-hw + 10, hh - 46);
    sw1.lineTo(-hw + 20, hh - 46);
    sw1.lineTo(-hw + 21, -hh + 30);
    sw1.closePath();
    glassPanel(ctx, sw1);

    const sw2 = new Path2D();
    sw2.moveTo(hw - 11, -hh + 30);
    sw2.lineTo(hw - 10, hh - 46);
    sw2.lineTo(hw - 20, hh - 46);
    sw2.lineTo(hw - 21, -hh + 30);
    sw2.closePath();
    glassPanel(ctx, sw2);

    // Rear window
    const rw = new Path2D();
    rw.moveTo(-hw + 12, hh - 44);
    rw.lineTo(-hw + 14, hh - 30);
    rw.lineTo(hw - 14, hh - 30);
    rw.lineTo(hw - 12, hh - 44);
    rw.closePath();
    glassPanel(ctx, rw);

    // Roof rails
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-hw + 14, -hh + 10);
    ctx.lineTo(-hw + 14, hh - 44);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hw - 14, -hh + 10);
    ctx.lineTo(hw - 14, hh - 44);
    ctx.stroke();

    // Cladding strip (dark lower body)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.roundRect(-hw + 2, hh - 22, w - 4, 14, 2);
    ctx.fill();

    headlight(ctx, -hw + 11, -hh + 9, 9, 5);
    headlight(ctx, hw - 11, -hh + 9, 9, 5);
    taillight(ctx, -hw + 11, hh - 7, 8, 4, true);
    taillight(ctx, hw - 11, hh - 7, 8, 4, braking);

    wheel(ctx, -hw + 10, -hh + 26, 12);
    wheel(ctx, hw - 10, -hh + 26, 12);
    wheel(ctx, -hw + 10, hh - 26, 12);
    wheel(ctx, hw - 10, hh - 26, 12);

    ctx.restore();
  }

  // ── HATCHBACK ───────────────────────────────
  // w=44, h=82
  function drawHatchback(ctx, w, h, bodyHex, braking = false) {
    const hw = w / 2, hh = h / 2;
    ctx.save();
    shadow(ctx, w, h);

    const { r, g, b } = Utils.hexToRgb(bodyHex);

    // Body — compact, tallish relative to length
    const body = new Path2D();
    body.moveTo(-hw + 5, -hh + 2);
    body.quadraticCurveTo(-hw, -hh + 4, -hw, -hh + 12);
    body.lineTo(-hw, hh - 12);
    body.quadraticCurveTo(-hw, hh - 2, -hw + 5, hh);
    body.lineTo(hw - 5, hh);
    body.quadraticCurveTo(hw, hh - 2, hw, hh - 12);
    body.lineTo(hw, -hh + 12);
    body.quadraticCurveTo(hw, -hh + 4, hw - 5, -hh + 2);
    body.lineTo(hw - 14, -hh);
    body.quadraticCurveTo(0, -hh - 1, -hw + 14, -hh);
    body.closePath();

    const bg = ctx.createLinearGradient(-hw, -hh, hw * 0.5, hh);
    bg.addColorStop(0,   `rgb(${Math.min(r+60,255)},${Math.min(g+60,255)},${Math.min(b+60,255)})`);
    bg.addColorStop(0.4, `rgb(${r},${g},${b})`);
    bg.addColorStop(1,   `rgb(${Math.max(r-45,0)},${Math.max(g-45,0)},${Math.max(b-45,0)})`);
    ctx.fillStyle = bg;
    ctx.fill(body);
    ctx.strokeStyle = `rgba(${Math.min(r+60,255)},${Math.min(g+60,255)},${Math.min(b+60,255)},0.5)`;
    ctx.lineWidth = 0.7;
    ctx.stroke(body);

    // Hatchback has a more integrated roof-to-rear angle
    const roof = new Path2D();
    roof.moveTo(-hw + 10, -hh + 26);
    roof.quadraticCurveTo(-hw + 8, -hh + 14, -hw + 15, -hh + 8);
    roof.quadraticCurveTo(0, -hh + 3, hw - 15, -hh + 8);
    roof.quadraticCurveTo(hw - 8, -hh + 14, hw - 10, -hh + 26);
    // Sloped hatch rear
    roof.lineTo(hw - 10, hh - 36);
    roof.lineTo(hw - 14, hh - 28);
    roof.quadraticCurveTo(0, hh - 24, -hw + 14, hh - 28);
    roof.lineTo(-hw + 10, hh - 36);
    roof.closePath();
    ctx.fillStyle = '#100012';
    ctx.fill(roof);

    // Windshield
    const ws = new Path2D();
    ws.moveTo(-hw + 12, -hh + 26);
    ws.quadraticCurveTo(-hw + 10, -hh + 14, -hw + 16, -hh + 9);
    ws.quadraticCurveTo(0, -hh + 4, hw - 16, -hh + 9);
    ws.quadraticCurveTo(hw - 10, -hh + 14, hw - 12, -hh + 26);
    ws.closePath();
    glassPanel(ctx, ws, true);

    // Rear hatch window (large)
    const rwp = new Path2D();
    rwp.moveTo(-hw + 12, hh - 38);
    rwp.lineTo(-hw + 16, hh - 28);
    rwp.lineTo(hw - 16, hh - 28);
    rwp.lineTo(hw - 12, hh - 38);
    rwp.closePath();
    glassPanel(ctx, rwp);

    headlight(ctx, -hw + 9, -hh + 7, 7, 4);
    headlight(ctx, hw - 9, -hh + 7, 7, 4);
    taillight(ctx, -hw + 9, hh - 6, 7, 3, true);
    taillight(ctx, hw - 9, hh - 6, 7, 3, braking);

    wheel(ctx, -hw + 8, -hh + 22, 9);
    wheel(ctx, hw - 8, -hh + 22, 9);
    wheel(ctx, -hw + 8, hh - 22, 9);
    wheel(ctx, hw - 8, hh - 22, 9);

    ctx.restore();
  }

  // ── PICKUP TRUCK ────────────────────────────
  // w=52, h=104
  function drawPickup(ctx, w, h, bodyHex, braking = false) {
    const hw = w / 2, hh = h / 2;
    ctx.save();
    shadow(ctx, w, h, 0.5);

    const { r, g, b } = Utils.hexToRgb(bodyHex);

    // Bed (rear)
    ctx.fillStyle = `rgb(${Math.max(r-50,0)},${Math.max(g-50,0)},${Math.max(b-50,0)})`;
    ctx.beginPath();
    ctx.roundRect(-hw + 3, hh - 48, w - 6, 44, [2, 2, 4, 4]);
    ctx.fill();
    // Bed interior
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.roundRect(-hw + 6, hh - 46, w - 12, 38, 2);
    ctx.fill();
    // Tailgate
    ctx.fillStyle = `rgb(${Math.max(r-20,0)},${Math.max(g-20,0)},${Math.max(b-20,0)})`;
    ctx.beginPath();
    ctx.roundRect(-hw + 3, hh - 10, w - 6, 6, 2);
    ctx.fill();

    // Cab
    const cab = new Path2D();
    cab.moveTo(-hw + 4, -hh + 2);
    cab.quadraticCurveTo(-hw, -hh + 4, -hw, -hh + 14);
    cab.lineTo(-hw, hh - 50);
    cab.quadraticCurveTo(-hw, hh - 42, -hw + 4, hh - 40);
    cab.lineTo(hw - 4, hh - 40);
    cab.quadraticCurveTo(hw, hh - 42, hw, hh - 50);
    cab.lineTo(hw, -hh + 14);
    cab.quadraticCurveTo(hw, -hh + 4, hw - 4, -hh + 2);
    cab.lineTo(hw - 16, -hh);
    cab.quadraticCurveTo(0, -hh - 1, -hw + 16, -hh);
    cab.closePath();

    const bg = ctx.createLinearGradient(-hw, -hh, hw * 0.7, hh - 40);
    bg.addColorStop(0,   `rgb(${Math.min(r+55,255)},${Math.min(g+55,255)},${Math.min(b+55,255)})`);
    bg.addColorStop(0.4, `rgb(${r},${g},${b})`);
    bg.addColorStop(1,   `rgb(${Math.max(r-35,0)},${Math.max(g-35,0)},${Math.max(b-35,0)})`);
    ctx.fillStyle = bg;
    ctx.fill(cab);
    ctx.strokeStyle = `rgba(${Math.min(r+60,255)},${Math.min(g+60,255)},${Math.min(b+60,255)},0.4)`;
    ctx.lineWidth = 0.8;
    ctx.stroke(cab);

    // Cab roof
    ctx.fillStyle = '#141420';
    ctx.beginPath();
    ctx.roundRect(-hw + 10, -hh + 12, w - 20, hh - 2, 5);
    ctx.fill();

    // Windshield
    const ws = new Path2D();
    ws.moveTo(-hw + 12, hh - 54);
    ws.lineTo(-hw + 14, -hh + 13);
    ws.lineTo(-hw + 18, -hh + 8);
    ws.quadraticCurveTo(0, -hh + 4, hw - 18, -hh + 8);
    ws.lineTo(hw - 14, -hh + 13);
    ws.lineTo(hw - 12, hh - 54);
    ws.closePath();
    glassPanel(ctx, ws, true);

    // Side window
    const sw = new Path2D();
    sw.moveTo(-hw + 11, hh - 56);
    sw.lineTo(-hw + 11, -hh + 13);
    sw.lineTo(-hw + 20, -hh + 13);
    sw.lineTo(-hw + 20, hh - 56);
    sw.closePath();
    glassPanel(ctx, sw);

    headlight(ctx, -hw + 10, -hh + 8, 9, 4);
    headlight(ctx, hw - 10, -hh + 8, 9, 4);
    taillight(ctx, -hw + 10, hh - 6, 8, 3, true);
    taillight(ctx, hw - 10, hh - 6, 8, 3, braking);

    // Big truck wheels
    wheel(ctx, -hw + 10, -hh + 28, 12);
    wheel(ctx, hw - 10, -hh + 28, 12);
    wheel(ctx, -hw + 10, hh - 28, 12);
    wheel(ctx, hw - 10, hh - 28, 12);

    ctx.restore();
  }

  // ── SEMI TRUCK ──────────────────────────────
  // w=60, h=140
  function drawTruck(ctx, w, h, cabHex, braking = false) {
    const hw = w / 2, hh = h / 2;
    ctx.save();
    shadow(ctx, w, h, 0.6);

    const { r, g, b } = Utils.hexToRgb(cabHex);

    // Trailer
    const tg = ctx.createLinearGradient(-hw, 0, hw, h * 0.2);
    tg.addColorStop(0, '#4a4a55');
    tg.addColorStop(0.5, '#5c5c68');
    tg.addColorStop(1, '#3a3a45');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.roundRect(-hw + 4, -hh * 0.1, w - 8, h * 0.62, [2, 2, 4, 4]);
    ctx.fill();
    // Trailer panels / ribbing
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 6; i++) {
      const py = -hh * 0.08 + i * (h * 0.62 / 6);
      ctx.beginPath();
      ctx.moveTo(-hw + 6, py);
      ctx.lineTo(hw - 6, py);
      ctx.stroke();
    }
    // Trailer rear lights
    ctx.fillStyle = 'rgba(255,60,0,0.9)';
    ctx.shadowBlur = 8; ctx.shadowColor = '#ff3000';
    ctx.fillRect(-hw + 6, -hh * 0.1 + h * 0.58, 8, 5);
    ctx.fillRect(hw - 14, -hh * 0.1 + h * 0.58, 8, 5);
    ctx.shadowBlur = 0;
    // Trailer doors
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -hh * 0.1);
    ctx.lineTo(0, -hh * 0.1 + h * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-hw + 6, -hh * 0.1 + h * 0.62 - 8);
    ctx.lineTo(hw - 6, -hh * 0.1 + h * 0.62 - 8);
    ctx.stroke();

    // Cab (sits at top)
    const cabTop = -hh;
    const cabH = h * 0.42;
    const cab = new Path2D();
    cab.moveTo(-hw + 5, cabTop + 3);
    cab.quadraticCurveTo(-hw, cabTop + 5, -hw, cabTop + 16);
    cab.lineTo(-hw, cabTop + cabH - 4);
    cab.quadraticCurveTo(-hw, cabTop + cabH, -hw + 5, cabTop + cabH);
    cab.lineTo(hw - 5, cabTop + cabH);
    cab.quadraticCurveTo(hw, cabTop + cabH, hw, cabTop + cabH - 4);
    cab.lineTo(hw, cabTop + 16);
    cab.quadraticCurveTo(hw, cabTop + 5, hw - 5, cabTop + 3);
    cab.lineTo(hw - 14, cabTop);
    cab.quadraticCurveTo(0, cabTop - 1, -hw + 14, cabTop);
    cab.closePath();

    const cbg = ctx.createLinearGradient(-hw, cabTop, hw * 0.6, cabTop + cabH);
    cbg.addColorStop(0,   `rgb(${Math.min(r+60,255)},${Math.min(g+60,255)},${Math.min(b+60,255)})`);
    cbg.addColorStop(0.5, `rgb(${r},${g},${b})`);
    cbg.addColorStop(1,   `rgb(${Math.max(r-40,0)},${Math.max(g-40,0)},${Math.max(b-40,0)})`);
    ctx.fillStyle = cbg;
    ctx.fill(cab);
    ctx.strokeStyle = `rgba(${Math.min(r+70,255)},${Math.min(g+70,255)},${Math.min(b+70,255)},0.45)`;
    ctx.lineWidth = 0.8;
    ctx.stroke(cab);

    // Cab roof
    ctx.fillStyle = '#0d0d18';
    ctx.beginPath();
    ctx.roundRect(-hw + 12, cabTop + 12, w - 24, cabH * 0.58, 5);
    ctx.fill();

    // Windshield
    const ws = new Path2D();
    ws.moveTo(-hw + 14, cabTop + cabH * 0.58);
    ws.lineTo(-hw + 16, cabTop + 13);
    ws.lineTo(-hw + 20, cabTop + 8);
    ws.quadraticCurveTo(0, cabTop + 4, hw - 20, cabTop + 8);
    ws.lineTo(hw - 16, cabTop + 13);
    ws.lineTo(hw - 14, cabTop + cabH * 0.58);
    ws.closePath();
    glassPanel(ctx, ws, true);

    // Headlights
    headlight(ctx, -hw + 10, cabTop + 8, 10, 5);
    headlight(ctx, hw - 10, cabTop + 8, 10, 5);
    // Cab marker lights
    ctx.fillStyle = '#ffaa00';
    ctx.shadowBlur = 5; ctx.shadowColor = '#ffaa00';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(-hw + 18 + i * 10, cabTop + 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    taillight(ctx, -hw + 10, cabTop + cabH - 4, 7, 3, true);
    taillight(ctx, hw - 10, cabTop + cabH - 4, 7, 3, braking);

    // Big dual rear wheels
    const ty = hh - 22;
    wheel(ctx, -hw + 8, cabTop + 36, 13);
    wheel(ctx, hw - 8, cabTop + 36, 13);
    // Dual rear
    wheel(ctx, -hw + 8, ty - 7, 13);
    wheel(ctx, -hw + 8, ty + 7, 13);
    wheel(ctx, hw - 8, ty - 7, 13);
    wheel(ctx, hw - 8, ty + 7, 13);

    ctx.restore();
  }

  // ── DISPATCH FUNCTION ──────────────────────

  function draw(ctx, type, x, y, bodyHex, options = {}) {
    ctx.save();
    ctx.translate(x, y);
    const { driftAngle = 0, braking = false, isPlayer = false } = options;

    switch(type) {
      case 'sports':   drawSportsCoupe(ctx, 52, 100, bodyHex, isPlayer, driftAngle, braking); break;
      case 'sedan':    drawSedan(ctx, 48, 92, bodyHex, braking); break;
      case 'suv':      drawSUV(ctx, 54, 96, bodyHex, braking); break;
      case 'hatchback':drawHatchback(ctx, 44, 82, bodyHex, braking); break;
      case 'pickup':   drawPickup(ctx, 52, 104, bodyHex, braking); break;
      case 'truck':    drawTruck(ctx, 60, 140, bodyHex, braking); break;
    }
    ctx.restore();
  }

  // Vehicle dimensions lookup
  const DIMS = {
    sports:    { w: 52, h: 100 },
    sedan:     { w: 48, h: 92 },
    suv:       { w: 54, h: 96 },
    hatchback: { w: 44, h: 82 },
    pickup:    { w: 52, h: 104 },
    truck:     { w: 60, h: 140 },
  };

  return { draw, DIMS };
})();
