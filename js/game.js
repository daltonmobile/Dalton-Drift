// ═══════════════════════════════════════════
// game.js — Main game loop & state machine
// ═══════════════════════════════════════════

const Game = (() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let lastTime = 0;

  let state    = 'menu';
  let camMode  = 'highway';
  let paused   = false;

  let frameCount = 0;
  let distance   = 0;
  let score      = 0;
  let speed      = 0;
  let baseSpeed  = 3.2;
  const MAX_SPEED = 17;

  let nitro          = 1.0;
  let nearMissTimer  = 999;
  let nearMissCount  = 0;
  let cameraShake    = 0;

  let settings = { sound: true, vibration: true, camera: 'highway' };

  // ── Resize ──────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ── Init ────────────────────────────────
  function init() {
    resize();
    window.addEventListener('resize', resize);
    loadSettings();
    Road.initStars();
    Road.postInitStars();
    Road.initBuildings();
    setupInput();
    startLoop();
    state = 'menu';
  }

  // ── Settings ────────────────────────────
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('dd_settings') || '{}');
      settings = { ...settings, ...s };
      camMode = settings.camera || 'highway';
    } catch(e) {}
  }
  function saveSettings() {
    settings.camera = camMode;
    localStorage.setItem('dd_settings', JSON.stringify(settings));
  }

  // ── Input ────────────────────────────────
  const keys = {};
  function setupInput() {
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
      if (e.code === 'Space' && state === 'playing') { e.preventDefault(); activateNitro(); }
    });
    window.addEventListener('keyup', e => {
      keys[e.code] = false;
      if (e.code === 'Space') deactivateNitro();
    });

    const tl = document.getElementById('touch-left');
    const tr = document.getElementById('touch-right');
    tl.style.pointerEvents = 'all';
    tr.style.pointerEvents = 'all';

    const down = (side) => {
      if (state !== 'playing') return;
      Player.setSteer(side === 'left', side === 'right');
    };
    const up = (side) => {
      Player.setSteer(
        side !== 'left'  && (keys['ArrowLeft']  || keys['KeyA']),
        side !== 'right' && (keys['ArrowRight'] || keys['KeyD'])
      );
    };

    ['touchstart','mousedown'].forEach(ev => {
      tl.addEventListener(ev, e => { e.preventDefault(); down('left');  }, { passive: false });
      tr.addEventListener(ev, e => { e.preventDefault(); down('right'); }, { passive: false });
    });
    ['touchend','touchcancel','mouseup'].forEach(ev => {
      tl.addEventListener(ev, () => up('left'));
      tr.addEventListener(ev, () => up('right'));
    });
  }

  let nitroActive = false;
  function activateNitro() {
    if (nitro > 0.05) { nitroActive = true; Audio.playNitroStart(); }
  }
  function deactivateNitro() { nitroActive = false; }

  // ── Start ────────────────────────────────
  function start() {
    camMode    = settings.camera || 'highway';
    frameCount = 0; distance = 0; score = 0;
    speed      = baseSpeed;
    nitro      = 1.0; nitroActive = false;
    nearMissCount = 0; nearMissTimer = 999;
    cameraShake   = 0; paused = false;
    state         = 'playing';

    Player.reset(W, H, camMode);
    Traffic.reset();
    Achievements.sessionReset();
    Audio.startEngine();

    UI.showHUD(true);
    UI.hideOverlay('overlay-pause');
    UI.hideOverlay('overlay-gameover');
    UI.showScreen(null);
  }

  // ── Pause ────────────────────────────────
  function togglePause() {
    if (state === 'playing') {
      paused = true; state = 'paused';
      UI.showOverlay('overlay-pause');
      Audio.stopEngine();
    } else if (state === 'paused') {
      paused = false; state = 'playing';
      UI.hideOverlay('overlay-pause');
      Audio.startEngine();
    }
  }

  // ── Quit ─────────────────────────────────
  function quit() {
    state = 'menu'; paused = false;
    Audio.stopEngine();
    UI.showHUD(false);
    UI.hideOverlay('overlay-pause');
    UI.hideOverlay('overlay-gameover');
    UI.showScreen('screen-menu');
    UI.updateMenuBest();
    Player.setSteer(false, false);
    nitroActive = false;
  }

  // ── Game Over ────────────────────────────
  function endGame() {
    state = 'gameover';
    Audio.stopEngine();
    Audio.playCollision();

    const best = Math.max(Math.round(distance), parseInt(localStorage.getItem('dd_best') || '0'));
    localStorage.setItem('dd_best', best);

    Achievements.check(distance, nearMissCount, score);

    document.getElementById('goDistance').textContent = Math.round(distance) + ' m';
    document.getElementById('goScore').textContent    = score.toLocaleString();
    document.getElementById('goBest').textContent     = best + ' m';
    UI.showOverlay('overlay-gameover');

    if (settings.vibration && navigator.vibrate) navigator.vibrate([80, 40, 200]);
  }

  // ── Loop ─────────────────────────────────
  function startLoop() {
    function loop(ts) {
      requestAnimationFrame(loop);
      const dt = Math.min(ts - lastTime, 50);
      lastTime = ts;
      tick(dt);
      render();
    }
    requestAnimationFrame(loop);
  }

  // ── Update ───────────────────────────────
  function tick(dt) {
    if (state !== 'playing') return;

    frameCount++;

    // Speed ramp
    const targetSpeed = Math.min(MAX_SPEED, baseSpeed + frameCount * 0.0025);
    speed = Utils.lerp(speed, targetSpeed, 0.018);

    // Nitro
    if (nitroActive && nitro > 0) {
      speed = Math.min(MAX_SPEED, speed * 1.55);
      nitro = Math.max(0, nitro - 0.006);
      if (nitro <= 0) { nitroActive = false; }
    } else {
      nitro = Math.min(1, nitro + 0.0018);
    }

    distance += speed * 0.21;
    score    += Math.round(speed * 0.75);

    Road.update(speed);

    // Keyboard steering
    Player.setSteer(
      keys['ArrowLeft']  || keys['KeyA'],
      keys['ArrowRight'] || keys['KeyD']
    );
    Player.update(W, H, camMode, speed);
    Traffic.update(speed, frameCount, Road.getLaneCount());

    // Collision
    if (!Player.isInvincible()) {
      const hit = Traffic.checkCollision(
        Player.getX(), Player.getY(), Player.getW(), Player.getH(), camMode, H
      );
      if (hit) {
        Player.spawnCollisionSparks();
        Player.makeInvincible(110);
        Traffic.removeVehicle(hit);
        cameraShake = 20;
        UI.flashScreen();
        if (settings.vibration && navigator.vibrate) navigator.vibrate([60, 20, 120]);
        endGame();
        return;
      }

      // Near miss
      const nm = Traffic.checkNearMiss(
        Player.getX(), Player.getY(), Player.getW(), Player.getH(), camMode, H
      );
      if (nm && nearMissTimer > 50) {
        nearMissTimer = 0;
        nearMissCount++;
        score += 50;
        Player.spawnNearMissSparks();
        Audio.playNearMiss();
        UI.showNearMiss();
        Achievements.onNearMiss(nearMissCount);
        if (settings.vibration && navigator.vibrate) navigator.vibrate(30);
      }
    }

    if (nearMissTimer < 999) nearMissTimer++;
    if (cameraShake > 0) { cameraShake *= 0.86; if (cameraShake < 0.4) cameraShake = 0; }

    Audio.updateEngine(speed / MAX_SPEED, nitroActive);
    UI.updateHUD(Math.round(distance), score, Math.round(speed * 6), nitro);
  }

  // ── Render ───────────────────────────────
  function render() {
    ctx.clearRect(0, 0, W, H);

    if (state === 'menu') {
      Road.update(1.0);
      if (camMode === 'topdown') Road.drawTopDown(ctx, W, H, 1.0);
      else                        Road.drawHighway(ctx, W, H, 1.0);
      ctx.fillStyle = 'rgba(0,0,0,0.52)';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      if (cameraShake > 0.4) {
        ctx.save();
        ctx.translate(
          (Math.random() - 0.5) * cameraShake * 2,
          (Math.random() - 0.5) * cameraShake * 1.2
        );
      }

      if (camMode === 'topdown') {
        Road.drawTopDown(ctx, W, H, speed);
        Traffic.drawTopDown(ctx, H);
        Player.draw(ctx, camMode);
      } else {
        Road.drawHighway(ctx, W, H, speed);
        Traffic.drawHighway(ctx);
        Player.draw(ctx, camMode);
      }

      // Speed lines at high speed
      if (speed > 11) {
        const alpha = Utils.clamp((speed - 11) / 6, 0, 0.2);
        drawSpeedLines(ctx, alpha);
      }

      drawVignette(ctx);

      if (cameraShake > 0.4) ctx.restore();
    }
  }

  function drawSpeedLines(ctx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const cx = W / 2, cy = H * 0.48;
    for (let i = 0; i < 10; i++) {
      const a   = (i / 10) * Math.PI * 2;
      const len = 90 + Math.random() * 110;
      const r0  = W * 0.24;
      ctx.strokeStyle = 'rgba(170,140,255,0.55)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette(ctx) {
    const vg = ctx.createRadialGradient(W/2, H/2, H * 0.22, W/2, H/2, H * 0.82);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function setCamMode(m) { camMode = m; settings.camera = m; saveSettings(); }
  function getCamMode()  { return camMode; }
  function getSettings() { return settings; }
  function setSetting(k, v) { settings[k] = v; saveSettings(); }

  return { init, start, togglePause, quit, setCamMode, getCamMode, getSettings, setSetting };
})();
