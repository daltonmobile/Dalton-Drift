// ═══════════════════════════════════════════
// game.js — Main game loop & state machine
// ═══════════════════════════════════════════

const Game = (() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let raf = null;
  let lastTime = 0;

  // ── Game state ──────────────────────────────
  let state      = 'menu';   // menu | playing | paused | gameover
  let camMode    = 'highway';
  let paused     = false;

  let frameCount = 0;
  let distance   = 0;
  let score      = 0;
  let speed      = 0;        // base scroll speed (px/frame equiv)
  let baseSpeed  = 3.2;
  const MAX_SPEED = 18;

  let nearMissTimer    = 0;  // frames since last near miss popup
  let nearMissCount    = 0;
  let cameraShake      = 0;
  let shakeDecay       = 0.88;
  let vibrating        = false;

  // Settings (loaded from storage)
  let settings = {
    sound:     true,
    vibration: true,
    camera:    'highway',
  };

  // ── Resize ─────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ── Init ────────────────────────────────────
  function init() {
    resize();
    window.addEventListener('resize', resize);
    loadSettings();
    Road.initStars();
    Road.postInitStars();
    Road.initBuildings();
    setupInput();
    startLoop();
    // Render menu background immediately
    state = 'menu';
  }

  // ── Settings persistence ───────────────────
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

  // ── Input ───────────────────────────────────
  let keys = {};
  function setupInput() {
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    // Touch zones (left/right half)
    const tl = document.getElementById('touch-left');
    const tr = document.getElementById('touch-right');

    function pointerDown(side) {
      if (state !== 'playing') return;
      Player.setSteer(side === 'left', side === 'right');
      document.getElementById('touch-' + side).classList.add('pressing');
    }
    function pointerUp(side) {
      // Only clear if no other pointer is still down
      Player.setSteer(
        document.getElementById('touch-left').classList.contains('pressing')  && side !== 'left',
        document.getElementById('touch-right').classList.contains('pressing') && side !== 'right'
      );
      document.getElementById('touch-' + side).classList.remove('pressing');
    }

    tl.style.pointerEvents = 'all';
    tr.style.pointerEvents = 'all';

    ['touchstart','mousedown'].forEach(ev => {
      tl.addEventListener(ev, e => { e.preventDefault(); pointerDown('left'); }, { passive: false });
      tr.addEventListener(ev, e => { e.preventDefault(); pointerDown('right'); }, { passive: false });
    });
    ['touchend','mouseup'].forEach(ev => {
      tl.addEventListener(ev, () => pointerUp('left'));
      tr.addEventListener(ev, () => pointerUp('right'));
    });
  }

  // ── Start game ──────────────────────────────
  function start() {
    camMode    = settings.camera || 'highway';
    frameCount = 0;
    distance   = 0;
    score      = 0;
    speed      = baseSpeed;
    nearMissCount = 0;
    nearMissTimer = 999;
    cameraShake   = 0;
    paused        = false;
    state         = 'playing';

    Player.reset(W, H, camMode);
    Traffic.reset();

    Audio.startEngine();
    UI.showHUD(true);
    UI.hideOverlay('overlay-pause');
    UI.hideOverlay('overlay-gameover');
    UI.showScreen(null); // hide all screens
  }

  // ── Toggle pause ───────────────────────────
  function togglePause() {
    if (state === 'playing') {
      paused = true;
      state  = 'paused';
      UI.showOverlay('overlay-pause');
      Audio.stopEngine();
    } else if (state === 'paused') {
      paused = false;
      state  = 'playing';
      UI.hideOverlay('overlay-pause');
      Audio.startEngine();
    }
  }

  // ── Quit to menu ───────────────────────────
  function quit() {
    state = 'menu';
    paused = false;
    Audio.stopEngine();
    UI.showHUD(false);
    UI.hideOverlay('overlay-pause');
    UI.hideOverlay('overlay-gameover');
    UI.showScreen('screen-menu');
    UI.updateMenuBest();
    Player.setSteer(false, false);
  }

  // ── Game over ──────────────────────────────
  function endGame() {
    state = 'gameover';
    Audio.stopEngine();
    Audio.playCollision();

    // Save best
    const best = Math.max(distance, parseInt(localStorage.getItem('dd_best') || '0'));
    localStorage.setItem('dd_best', best);

    Achievements.check(distance, nearMissCount, score);

    UI.showOverlay('overlay-gameover');
    document.getElementById('goDistance').textContent = Math.round(distance) + ' m';
    document.getElementById('goScore').textContent    = score.toLocaleString();
    document.getElementById('goBest').textContent     = Math.round(best) + ' m';

    // Vibration
    if (settings.vibration && navigator.vibrate) navigator.vibrate([80, 40, 200]);
  }

  // ── Main loop ──────────────────────────────
  function startLoop() {
    function loop(ts) {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(ts - lastTime, 50);
      lastTime = ts;
      tick(dt);
      render();
    }
    requestAnimationFrame(loop);
  }

  // ── Update ─────────────────────────────────
  function tick(dt) {
    if (state !== 'playing') return;

    frameCount++;

    // Speed ramp (soft exponential)
    const targetSpeed = Math.min(MAX_SPEED, baseSpeed + frameCount * 0.0028);
    speed = Utils.lerp(speed, targetSpeed, 0.02);

    // Distance
    distance += speed * 0.22;
    score    += Math.round(speed * 0.8);

    // Road scroll
    Road.update(speed);

    // Keyboard steering
    Player.setSteer(
      keys['ArrowLeft']  || keys['KeyA'],
      keys['ArrowRight'] || keys['KeyD']
    );
    Player.update(W, H, camMode, speed);

    // Traffic
    Traffic.update(speed, frameCount, Road.getLaneCount());

    // Collision
    if (!Player.isInvincible()) {
      const hit = Traffic.checkCollision(
        Player.getX(), Player.getY(), Player.getW(), Player.getH(),
        camMode, H
      );
      if (hit) {
        Player.spawnCollisionSparks();
        Player.makeInvincible(110);
        Traffic.removeVehicle(hit);
        cameraShake = 18;
        if (settings.vibration && navigator.vibrate) navigator.vibrate([60, 20, 120]);
        endGame();
        return;
      }

      // Near miss
      const nm = Traffic.checkNearMiss(
        Player.getX(), Player.getY(), Player.getW(), Player.getH(),
        camMode, H
      );
      if (nm && nearMissTimer > 45) {
        nearMissTimer = 0;
        nearMissCount++;
        score += 50;
        Player.spawnNearMissSparks();
        Audio.playNearMiss();
        UI.showNearMiss();
        Achievements.onNearMiss();
        if (settings.vibration && navigator.vibrate) navigator.vibrate(30);
      }
    }

    if (nearMissTimer < 999) nearMissTimer++;

    // Camera shake decay
    if (cameraShake > 0) cameraShake *= shakeDecay;
    if (cameraShake < 0.5) cameraShake = 0;

    // Audio engine sound
    Audio.updateEngine(speed / MAX_SPEED, false);

    // HUD
    UI.updateHUD(Math.round(distance), score, Math.round(speed * 6));
  }

  // ── Render ─────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, W, H);

    if (state === 'menu') {
      // Animated background on menu
      Road.update(1.2);
      if (camMode === 'topdown') Road.drawTopDown(ctx, W, H, 1.2);
      else                        Road.drawHighway(ctx, W, H, 1.2);
      // dim overlay
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    if (state === 'playing' || state === 'paused' || state === 'gameover') {
      // Camera shake
      if (cameraShake > 0.5) {
        ctx.save();
        ctx.translate(
          (Math.random() - 0.5) * cameraShake * 2,
          (Math.random() - 0.5) * cameraShake * 1.2
        );
      }

      // Road
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
      if (speed > 10) {
        const alpha = Utils.clamp((speed - 10) / 8, 0, 0.22);
        drawSpeedLines(alpha);
      }

      // Vignette
      drawVignette();

      if (cameraShake > 0.5) ctx.restore();
    }
  }

  function drawSpeedLines(alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const cx = W / 2, cy = H * 0.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const len = 80 + Math.random() * 120;
      const r0 = W * 0.22;
      ctx.strokeStyle = 'rgba(180,160,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette() {
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.25, W/2, H/2, H*0.82);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // Public API
  function setCamMode(mode) { camMode = mode; settings.camera = mode; saveSettings(); }
  function getCamMode()     { return camMode; }
  function getSettings()    { return settings; }
  function setSetting(key, val) { settings[key] = val; saveSettings(); }

  return { init, start, togglePause, quit, setCamMode, getCamMode, getSettings, setSetting };
})();
