// ═══════════════════════════════════════════
// player.js — Player car physics + rendering
// ═══════════════════════════════════════════

const Player = (() => {
  const CAR_W = 56;
  const CAR_H = 100;

  let x, y;
  let velX = 0;
  let driftAngle = 0;
  let invincibleFrames = 0;
  let smoke = [];
  let sparks = [];
  let steerLeft = false;
  let steerRight = false;

  const STEER_SPEED  = 7.2;
  const STEER_RETURN = 0.74;
  const MAX_VEL      = 10;
  const DRIFT_FACTOR = 0.016;

  function reset(canvasW, canvasH, camMode) {
    x = canvasW / 2;
    y = getDefaultY(canvasH, camMode);
    velX = 0; driftAngle = 0;
    invincibleFrames = 0;
    smoke = []; sparks = [];
  }

  function getDefaultY(H, camMode) {
    return camMode === 'topdown' ? H * 0.78 : H * 0.83;
  }

  function setSteer(left, right) { steerLeft = left; steerRight = right; }

  function update(canvasW, canvasH, camMode, speed) {
    if (steerLeft)       velX -= STEER_SPEED;
    else if (steerRight) velX += STEER_SPEED;
    else                 velX *= STEER_RETURN;

    velX = Utils.clamp(velX, -MAX_VEL, MAX_VEL);
    x += velX;
    driftAngle = Utils.lerp(driftAngle, velX * DRIFT_FACTOR, 0.14);

    const roadL = camMode === 'topdown'
      ? Road.getTdRoadL() + CAR_W / 2 + 4
      : canvasW * 0.10 + CAR_W / 2;
    const roadR = camMode === 'topdown'
      ? Road.getTdRoadR() - CAR_W / 2 - 4
      : canvasW * 0.90 - CAR_W / 2;

    if (x < roadL) { x = roadL; velX *= -0.2; }
    if (x > roadR) { x = roadR; velX *= -0.2; }

    y = getDefaultY(canvasH, camMode);
    if (invincibleFrames > 0) invincibleFrames--;

    // Tyre smoke
    if (Math.abs(velX) > 3.5 && speed > 4) {
      smoke.push({
        x: x + (Math.random() - 0.5) * 24,
        y: y + CAR_H * 0.4,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.6 + Math.random() * 0.8,
        r: 5 + Math.random() * 5,
        life: 1,
      });
    }

    smoke  = smoke.filter(p => p.life > 0);
    sparks = sparks.filter(p => p.life > 0);

    smoke.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.r += 0.7; p.life -= 0.022;
    });
    sparks.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.2; p.life -= 0.038;
    });
  }

  function spawnCollisionSparks() {
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 9;
      sparks.push({
        x: x + (Math.random() - 0.5) * 32,
        y: y + (Math.random() - 0.5) * 44,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 2,
        r: 2 + Math.random() * 2.5, life: 1,
        color: Math.random() > 0.5 ? '#fbbf24' : '#ff4444',
      });
    }
  }

  function spawnNearMissSparks() {
    for (let i = 0; i < 8; i++) {
      sparks.push({
        x: x + (Math.random() - 0.5) * 44,
        y: y + (Math.random() - 0.5) * 22,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 4,
        r: 2, life: 1, color: '#fbbf24',
      });
    }
  }

  function makeInvincible(frames) { invincibleFrames = frames || 110; }
  function isInvincible() { return invincibleFrames > 0; }

  function draw(ctx, camMode) {
    // Smoke
    smoke.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life * 0.5;
      const sg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      sg.addColorStop(0, 'rgba(210,200,230,0.7)');
      sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Player car (blink when invincible)
    const blink = invincibleFrames > 0 && Math.floor(invincibleFrames / 5) % 2 === 0;
    if (!blink) {
      Sprites.drawPlayer(ctx, x, y, CAR_W * 1.8, CAR_H * 1.4, driftAngle, camMode);
    }

    // Sparks
    sparks.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8; ctx.shadowColor = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  function getX()    { return x; }
  function getY()    { return y; }
  function getW()    { return CAR_W; }
  function getH()    { return CAR_H; }
  function getDrift(){ return driftAngle; }

  return {
    reset, update, draw, setSteer,
    spawnCollisionSparks, spawnNearMissSparks,
    makeInvincible, isInvincible,
    getX, getY, getW, getH, getDrift,
  };
})();
