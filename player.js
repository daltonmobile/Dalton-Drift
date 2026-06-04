// ═══════════════════════════════════════════
// player.js — Player car physics + rendering
// ═══════════════════════════════════════════

const Player = (() => {
  const CAR_W = 52;
  const CAR_H = 100;

  let x, y;
  let velX = 0;
  let driftAngle = 0;
  let invincibleFrames = 0;

  let smoke = [];
  let sparks = [];

  let steerLeft  = false;
  let steerRight = false;

  const STEER_SPEED   = 7.5;
  const STEER_RETURN  = 0.72;
  const MAX_VEL       = 11;
  const DRIFT_FACTOR  = 0.018;

  function reset(canvasW, canvasH, camMode) {
    x = canvasW / 2;
    y = getDefaultY(canvasH, camMode);
    velX = 0;
    driftAngle = 0;
    invincibleFrames = 0;
    smoke = [];
    sparks = [];
  }

  function getDefaultY(H, camMode) {
    return camMode === 'topdown' ? H * 0.78 : H * 0.82;
  }

  function setSteer(left, right) {
    steerLeft  = left;
    steerRight = right;
  }

  function update(canvasW, canvasH, camMode, speed) {
    // Horizontal steering
    if (steerLeft)       velX -= STEER_SPEED;
    else if (steerRight) velX += STEER_SPEED;
    else                 velX *= STEER_RETURN;

    velX = Utils.clamp(velX, -MAX_VEL, MAX_VEL);
    x += velX;

    // Drift angle (visual lean into turn)
    driftAngle = Utils.lerp(driftAngle, velX * DRIFT_FACTOR, 0.14);

    // Clamp to road bounds
    const roadL = camMode === 'topdown'
      ? Road.getTdRoadL() + CAR_W / 2 + 4
      : canvasW * 0.10 + CAR_W / 2;
    const roadR = camMode === 'topdown'
      ? Road.getTdRoadR() - CAR_W / 2 - 4
      : canvasW * 0.90 - CAR_W / 2;

    const wasAtEdge = x <= roadL || x >= roadR;
    x = Utils.clamp(x, roadL, roadR);
    if (wasAtEdge) velX *= -0.2;

    // Y position
    y = getDefaultY(canvasH, camMode);

    // Invincibility countdown
    if (invincibleFrames > 0) invincibleFrames--;

    // Tyre smoke when steering hard or at speed
    if (Math.abs(velX) > 4 && speed > 4) {
      spawnSmoke();
    }

    // Update particles
    smoke  = smoke.filter(p => p.life > 0);
    sparks = sparks.filter(p => p.life > 0);
    smoke.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.r  += 0.6;
      p.life -= 0.024;
    });
    sparks.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.04;
    });
  }

  function spawnSmoke() {
    const sx = x + (Math.random() - 0.5) * 22;
    const sy = y + CAR_H * 0.38;
    smoke.push({
      x: sx, y: sy,
      vx: (Math.random() - 0.5) * 1.2,
      vy: Math.random() * 1.0 + 0.3,
      r: 5 + Math.random() * 4,
      life: 1,
    });
  }

  function spawnCollisionSparks() {
    for (let i = 0; i < 22; i++) {
      const a = (Math.random() * Math.PI * 2);
      const spd = 2 + Math.random() * 8;
      sparks.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 40,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 2,
        r: 2 + Math.random() * 2,
        life: 1,
        color: Math.random() > 0.5 ? '#fbbf24' : '#ff4444',
      });
    }
  }

  function spawnNearMissSparks(vx2, vy2) {
    for (let i = 0; i < 8; i++) {
      sparks.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 4,
        r: 2,
        life: 1,
        color: '#fbbf24',
      });
    }
  }

  function makeInvincible(frames = 100) {
    invincibleFrames = frames;
  }

  function isInvincible() { return invincibleFrames > 0; }

  // ── Drawing ─────────────────────────────────

  function draw(ctx, camMode) {
    // Smoke behind car
    smoke.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life * 0.55;
      const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      sg.addColorStop(0, 'rgba(200,200,220,0.7)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Player car — blink when invincible
    const blink = invincibleFrames > 0 && Math.floor(invincibleFrames / 5) % 2 === 0;
    if (!blink) {
      Sprites.draw(ctx, 'sports', x, y, '#5b21b6', {
        isPlayer:   true,
        driftAngle: driftAngle,
      });
    }

    // Sparks on top
    sparks.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6; ctx.shadowColor = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  // Public getters
  function getX()  { return x; }
  function getY()  { return y; }
  function getW()  { return CAR_W; }
  function getH()  { return CAR_H; }
  function getDrift() { return driftAngle; }

  return {
    reset, update, draw, setSteer,
    spawnCollisionSparks, spawnNearMissSparks, makeInvincible, isInvincible,
    getX, getY, getW, getH, getDrift,
  };
})();
