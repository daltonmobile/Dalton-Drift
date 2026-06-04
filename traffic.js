// ═══════════════════════════════════════════
// traffic.js — Traffic vehicle spawning + update
// ═══════════════════════════════════════════

const Traffic = (() => {

  const TYPES = [
    { type: 'sedan',     color: '#c0392b', w: 48, h: 92,  speedMult: 0.55 },
    { type: 'sedan',     color: '#2980b9', w: 48, h: 92,  speedMult: 0.50 },
    { type: 'sedan',     color: '#27ae60', w: 48, h: 92,  speedMult: 0.60 },
    { type: 'hatchback', color: '#e67e22', w: 44, h: 82,  speedMult: 0.65 },
    { type: 'hatchback', color: '#8e44ad', w: 44, h: 82,  speedMult: 0.70 },
    { type: 'suv',       color: '#1a252f', w: 54, h: 96,  speedMult: 0.45 },
    { type: 'suv',       color: '#2c3e50', w: 54, h: 96,  speedMult: 0.40 },
    { type: 'pickup',    color: '#6c5ce7', w: 52, h: 104, speedMult: 0.38 },
    { type: 'pickup',    color: '#00b894', w: 52, h: 104, speedMult: 0.35 },
    { type: 'truck',     color: '#636e72', w: 60, h: 140, speedMult: 0.22 },
  ];

  let vehicles = [];
  let spawnTimer = 0;
  let spawnInterval = 90; // frames between spawns, decreases with difficulty

  function reset() {
    vehicles = [];
    spawnTimer = 0;
    spawnInterval = 90;
  }

  function spawn(laneCount, gameSpeed) {
    const tdef = TYPES[Math.floor(Math.random() * TYPES.length)];
    const lane = Math.floor(Math.random() * laneCount);

    // Don't stack vehicles on same lane
    const tooClose = vehicles.some(v =>
      v.lane === lane && v.normY < 0.12
    );
    if (tooClose) return;

    vehicles.push({
      ...tdef,
      lane,
      normY: 0,         // 0 = horizon, 1 = bottom of screen
      vy:    tdef.speedMult * gameSpeed * 0.014,
      braking: Math.random() < 0.15,
    });
  }

  function update(gameSpeed, frameCount, laneCount) {
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawn(laneCount, gameSpeed);
      // Difficulty ramp: interval shrinks to min 28
      spawnInterval = Math.max(28, 90 - Math.floor(frameCount / 180));
    }

    vehicles.forEach(v => {
      v.normY += v.vy + gameSpeed * 0.009;
    });

    // Remove off-screen
    vehicles = vehicles.filter(v => v.normY <= 1.1);
  }

  // ── Highway draw ────────────────────────────
  function drawHighway(ctx) {
    // Sort back-to-front so closer cars overlap distant
    const sorted = [...vehicles].sort((a, b) => a.normY - b.normY);
    sorted.forEach(v => {
      const pos = Road.highwayCarPos(v.lane, v.normY);
      if (pos.y < Road.getHorizonY()) return;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.scale(pos.scale, pos.scale);
      Sprites.draw(ctx, v.type, 0, 0, v.color, { braking: v.braking });
      ctx.restore();
    });
  }

  // ── Top-down draw ───────────────────────────
  function drawTopDown(ctx, canvasH) {
    vehicles.forEach(v => {
      const x = Road.getTdLaneX(v.lane);
      const y = v.normY * canvasH;
      Sprites.draw(ctx, v.type, x, y, v.color, { braking: v.braking });
    });
  }

  // ── Collision check vs player ────────────────
  // Returns the vehicle that was hit, or null
  function checkCollision(playerX, playerY, playerW, playerH, camMode, canvasH) {
    for (let v of vehicles) {
      let vx, vy, vw, vh;

      if (camMode === 'highway') {
        const pos = Road.highwayCarPos(v.lane, v.normY);
        vx = pos.x; vy = pos.y;
        vw = v.w * pos.scale;
        vh = v.h * pos.scale;
      } else {
        vx = Road.getTdLaneX(v.lane);
        vy = v.normY * canvasH;
        vw = v.w; vh = v.h;
      }

      const dx = Math.abs(vx - playerX);
      const dy = Math.abs(vy - playerY);
      if (dx < (vw + playerW) * 0.40 && dy < (vh + playerH) * 0.36) {
        return v;
      }
    }
    return null;
  }

  // Near-miss: within a slightly wider margin but not colliding
  function checkNearMiss(playerX, playerY, playerW, playerH, camMode, canvasH) {
    for (let v of vehicles) {
      let vx, vy, vw, vh;
      if (camMode === 'highway') {
        const pos = Road.highwayCarPos(v.lane, v.normY);
        vx = pos.x; vy = pos.y;
        vw = v.w * pos.scale; vh = v.h * pos.scale;
      } else {
        vx = Road.getTdLaneX(v.lane);
        vy = v.normY * canvasH;
        vw = v.w; vh = v.h;
      }
      const dx = Math.abs(vx - playerX);
      const dy = Math.abs(vy - playerY);
      const isHit   = dx < (vw + playerW) * 0.40 && dy < (vh + playerH) * 0.36;
      const isClose = dx < (vw + playerW) * 0.68 && dy < (vh + playerH) * 0.58;
      if (isClose && !isHit) return v;
    }
    return null;
  }

  function removeVehicle(v) {
    vehicles = vehicles.filter(vv => vv !== v);
  }

  function getVehicles() { return vehicles; }

  return { reset, update, drawHighway, drawTopDown, checkCollision, checkNearMiss, removeVehicle, getVehicles };
})();
