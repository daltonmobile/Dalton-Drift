// game.js — fixed touch input, proper car sizing, traffic visibility
const Game = (() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, lastTime = 0;
  let state = 'menu', camMode = 'highway', paused = false;
  let frameCount=0, distance=0, score=0, speed=0;
  const BASE_SPEED=3.5, MAX_SPEED=18;
  let nitro=1, nitroActive=false;
  let nearMissTimer=999, nearMissCount=0, cameraShake=0;
  let settings = { sound:true, vibration:true, camera:'highway' };

  // Touch state — tracked by pointer ID
  const activePointers = {};
  let steerLeftActive = false;
  let steerRightActive = false;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    loadSettings();
    Road.initStars(); Road.postInitStars(); Road.initBuildings();
    setupInput();
    startLoop();
  }

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('dd_settings')||'{}');
      settings = {...settings,...s};
      camMode = settings.camera || 'highway';
    } catch(e) {}
  }
  function saveSettings() {
    settings.camera = camMode;
    localStorage.setItem('dd_settings', JSON.stringify(settings));
  }

  // ── INPUT ── robust touch + keyboard ──────────────────────
  const keys = {};

  function setupInput() {
    // Keyboard
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code==='KeyP'||e.code==='Escape') togglePause();
      if (e.code==='Space' && state==='playing') { e.preventDefault(); activateNitro(); }
    });
    window.addEventListener('keyup', e => {
      keys[e.code] = false;
      if (e.code==='Space') nitroActive = false;
    });

    // Use the ENTIRE canvas for touch — split left/right by x position
    // This is more reliable than separate divs on mobile browsers
    canvas.addEventListener('touchstart', onTouchStart, {passive:false});
    canvas.addEventListener('touchmove',  onTouchMove,  {passive:false});
    canvas.addEventListener('touchend',   onTouchEnd,   {passive:false});
    canvas.addEventListener('touchcancel',onTouchEnd,   {passive:false});

    // HUD pause button — use getElementById to attach properly
    document.getElementById('pauseBtn').addEventListener('touchend', e => {
      e.preventDefault(); e.stopPropagation(); togglePause();
    });
    document.getElementById('pauseBtn').addEventListener('click', e => {
      e.stopPropagation(); togglePause();
    });

    // Overlay buttons
    document.getElementById('resumeBtn').addEventListener('click', togglePause);
    document.getElementById('quitBtn').addEventListener('click', quit);
    document.getElementById('playAgainBtn').addEventListener('click', start);
    document.getElementById('mainMenuBtn').addEventListener('click', quit);
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (state !== 'playing') return;
    for (const t of e.changedTouches) {
      activePointers[t.identifier] = t.clientX < W / 2 ? 'left' : 'right';
    }
    updateSteerFromPointers();
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (state !== 'playing') return;
    // Update side if finger crosses midpoint
    for (const t of e.changedTouches) {
      if (activePointers[t.identifier] !== undefined) {
        activePointers[t.identifier] = t.clientX < W / 2 ? 'left' : 'right';
      }
    }
    updateSteerFromPointers();
  }
  function onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      delete activePointers[t.identifier];
    }
    updateSteerFromPointers();
  }
  function updateSteerFromPointers() {
    const sides = Object.values(activePointers);
    steerLeftActive  = sides.includes('left');
    steerRightActive = sides.includes('right');
  }

  function activateNitro() {
    if (nitro > 0.05) { nitroActive = true; Audio.playNitroStart(); }
  }

  // ── GAME FLOW ─────────────────────────────────────────────
  function start() {
    camMode = settings.camera || 'highway';
    frameCount=0; distance=0; score=0; speed=BASE_SPEED;
    nitro=1; nitroActive=false;
    nearMissCount=0; nearMissTimer=999; cameraShake=0; paused=false;
    // Reset pointer tracking
    for (const k in activePointers) delete activePointers[k];
    steerLeftActive=false; steerRightActive=false;
    state = 'playing';
    Player.reset(W, H, camMode);
    Traffic.reset();
    Achievements.sessionReset();
    Audio.startEngine();
    UI.showHUD(true);
    UI.hideOverlay('overlay-pause');
    UI.hideOverlay('overlay-gameover');
    UI.showScreen(null);
  }

  function togglePause() {
    if (state==='playing') {
      paused=true; state='paused';
      UI.showOverlay('overlay-pause');
      Audio.stopEngine();
    } else if (state==='paused') {
      paused=false; state='playing';
      UI.hideOverlay('overlay-pause');
      Audio.startEngine();
    }
  }

  function quit() {
    state='menu'; paused=false; nitroActive=false;
    for (const k in activePointers) delete activePointers[k];
    steerLeftActive=false; steerRightActive=false;
    Audio.stopEngine();
    Player.setSteer(false,false);
    UI.showHUD(false);
    UI.hideOverlay('overlay-pause');
    UI.hideOverlay('overlay-gameover');
    UI.showScreen('screen-menu');
    UI.updateMenuBest();
  }

  function endGame() {
    state='gameover';
    Audio.stopEngine(); Audio.playCollision();
    const best = Math.max(Math.round(distance), parseInt(localStorage.getItem('dd_best')||'0'));
    localStorage.setItem('dd_best', best);
    Achievements.check(distance, nearMissCount, score);
    document.getElementById('goDistance').textContent = Math.round(distance)+' m';
    document.getElementById('goScore').textContent    = score.toLocaleString();
    document.getElementById('goBest').textContent     = best+' m';
    UI.showOverlay('overlay-gameover');
    if (settings.vibration && navigator.vibrate) navigator.vibrate([80,40,200]);
  }

  // ── LOOP ──────────────────────────────────────────────────
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

  function tick(dt) {
    if (state !== 'playing') return;
    frameCount++;

    // Speed ramp
    const target = Math.min(MAX_SPEED, BASE_SPEED + frameCount * 0.003);
    speed = Utils.lerp(speed, target, 0.02);

    // Nitro
    if (nitroActive && nitro > 0) {
      speed = Math.min(MAX_SPEED, speed * 1.6);
      nitro = Math.max(0, nitro - 0.006);
      if (nitro <= 0) nitroActive = false;
    } else {
      nitro = Math.min(1, nitro + 0.002);
    }

    distance += speed * 0.22;
    score += Math.round(speed * 0.8);
    Road.update(speed);

    // Steer: keyboard OR touch
    const goLeft  = keys['ArrowLeft']  || keys['KeyA'] || steerLeftActive;
    const goRight = keys['ArrowRight'] || keys['KeyD'] || steerRightActive;
    Player.setSteer(goLeft, goRight);
    Player.update(W, H, camMode, speed);
    Traffic.update(speed, frameCount, Road.getLaneCount());

    // Collision
    if (!Player.isInvincible()) {
      const hit = Traffic.checkCollision(Player.getX(),Player.getY(),Player.getW(),Player.getH(),camMode,H);
      if (hit) {
        Player.spawnCollisionSparks();
        Player.makeInvincible(110);
        Traffic.removeVehicle(hit);
        cameraShake=22; UI.flashScreen();
        if (settings.vibration && navigator.vibrate) navigator.vibrate([60,20,120]);
        endGame(); return;
      }
      const nm = Traffic.checkNearMiss(Player.getX(),Player.getY(),Player.getW(),Player.getH(),camMode,H);
      if (nm && nearMissTimer > 50) {
        nearMissTimer=0; nearMissCount++; score+=50;
        Player.spawnNearMissSparks();
        Audio.playNearMiss(); UI.showNearMiss();
        Achievements.onNearMiss(nearMissCount);
        if (settings.vibration && navigator.vibrate) navigator.vibrate(30);
      }
    }
    if (nearMissTimer < 999) nearMissTimer++;
    if (cameraShake > 0) { cameraShake *= 0.84; if (cameraShake < 0.4) cameraShake=0; }

    Audio.updateEngine(speed / MAX_SPEED, nitroActive);
    UI.updateHUD(Math.round(distance), score, Math.round(speed*6), nitro);
  }

  // ── RENDER ────────────────────────────────────────────────
  function render() {
    ctx.clearRect(0,0,W,H);
    const isGame = state==='playing'||state==='paused'||state==='gameover';

    if (state==='menu') Road.update(1.2);

    if (cameraShake > 0.4) {
      ctx.save();
      ctx.translate((Math.random()-0.5)*cameraShake*2,(Math.random()-0.5)*cameraShake);
    }

    if (camMode === 'dashboard') {
      if (isGame) {
        Dashboard.update(Player.getDrift());
        Dashboard.draw(ctx, W, H, speed, MAX_SPEED, nitro, distance,
                       Traffic.getVehicles(), Road, Road.getOffset());
      } else {
        // Menu background — highway
        Road.drawHighway(ctx, W, H, 1.2);
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H);
      }
    } else if (camMode==='topdown') {
      Road.drawTopDown(ctx, W, H, speed);
      if (isGame) { Traffic.drawTopDown(ctx, H); Player.draw(ctx, camMode, nitroActive); }
    } else {
      Road.drawHighway(ctx, W, H, speed);
      if (isGame) { Traffic.drawHighway(ctx); Player.draw(ctx, camMode, nitroActive); }
    }

    if (isGame && camMode !== 'dashboard' && speed > 11)
      drawSpeedLines(Utils.clamp((speed-11)/7, 0, 0.22));
    if (cameraShake > 0.4) ctx.restore();
    if (camMode !== 'dashboard') drawVignette();
    if (state==='menu' && camMode !== 'dashboard') {
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H);
    }
  }

  function drawSpeedLines(alpha) {
    ctx.save(); ctx.globalAlpha=alpha;
    const cx=W/2, cy=H*0.5;
    for (let i=0; i<12; i++) {
      const a=(i/12)*Math.PI*2, len=80+Math.random()*130, r0=W*0.2;
      ctx.strokeStyle='rgba(160,120,255,0.5)'; ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(a)*r0, cy+Math.sin(a)*r0);
      ctx.lineTo(cx+Math.cos(a)*(r0+len), cy+Math.sin(a)*(r0+len));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette() {
    const vg = ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.85);
    vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.52)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  }

  function setCamMode(m) { camMode=m; settings.camera=m; saveSettings(); }
  function getCamMode()  { return camMode; }
  function getSettings() { return settings; }
  function setSetting(k,v) { settings[k]=v; saveSettings(); }

  return { init, start, togglePause, quit, setCamMode, getCamMode, getSettings, setSetting };
})();
