// ═══════════════════════════════════════════
// traffic.js — Traffic vehicle spawning + update
// Uses real PNG sprites from Sprites module
// ═══════════════════════════════════════════

const Traffic = (() => {
  let vehicles = [];
  let spawnTimer = 0;
  let spawnInterval = 80;

  function reset() {
    vehicles = [];
    spawnTimer = 0;
    spawnInterval = 80;
  }

  function spawn(laneCount, gameSpeed) {
    const types = Sprites.TRAFFIC_TYPES;
    const tdef = types[Math.floor(Math.random() * types.length)];
    const lane = Math.floor(Math.random() * laneCount);

    const tooClose = vehicles.some(v => v.lane === lane && v.normY < 0.14);
    if (tooClose) return;

    vehicles.push({
      ...tdef,
      lane,
      normY: 0,
      vy: tdef.speedMult * gameSpeed * 0.013,
    });
  }

  function update(gameSpeed, frameCount, laneCount) {
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawn(laneCount, gameSpeed);
      spawnInterval = Math.max(30, 80 - Math.floor(frameCount / 200));
    }
    vehicles.forEach(v => {
      v.normY += v.vy + gameSpeed * 0.0085;
    });
    vehicles = vehicles.filter(v => v.normY <= 1.12);
  }

  // Highway perspective draw
  function drawHighway(ctx) {
    const sorted = [...vehicles].sort((a, b) => a.normY - b.normY);
    sorted.forEach(v => {
      const pos = Road.highwayCarPos(v.lane, v.normY);
      if (pos.y < Road.getHorizonY()) return;
      const dw = v.w * pos.scale;
      const dh = v.h * pos.scale;
      Sprites.drawTraffic(ctx, pos.x, pos.y, dw, dh, v.assetKey, 1);
    });
  }

  // Top-down draw
  function drawTopDown(ctx, canvasH) {
    vehicles.forEach(v => {
      const x = Road.getTdLaneX(v.lane);
      const y = v.normY * canvasH;
      Sprites.drawTraffic(ctx, x, y, v.w, v.h, v.assetKey, 1);
    });
  }

  // Collision detection
  function checkCollision(playerX, playerY, playerW, playerH, camMode, canvasH) {
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
      if (dx < (vw + playerW) * 0.38 && dy < (vh + playerH) * 0.34) return v;
    }
    return null;
  }

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
      const isHit   = dx < (vw + playerW) * 0.38 && dy < (vh + playerH) * 0.34;
      const isClose = dx < (vw + playerW) * 0.65 && dy < (vh + playerH) * 0.56;
      if (isClose && !isHit) return v;
    }
    return null;
  }

  function removeVehicle(v) { vehicles = vehicles.filter(vv => vv !== v); }
  function getVehicles() { return vehicles; }

  return { reset, update, drawHighway, drawTopDown, checkCollision, checkNearMiss, removeVehicle, getVehicles };
})();
