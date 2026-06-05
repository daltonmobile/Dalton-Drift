// game.js
const Game = (() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, lastTime = 0;
  let state = 'menu', camMode = 'highway', paused = false;
  let frameCount=0, distance=0, score=0, speed=0;
  const BASE_SPEED=3.2, MAX_SPEED=17;
  let nitro=1, nitroActive=false;
  let nearMissTimer=999, nearMissCount=0, cameraShake=0;
  let settings = { sound:true, vibration:true, camera:'highway' };

  function resize() { W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    loadSettings();
    Road.initStars(); Road.postInitStars(); Road.initBuildings();
    setupInput();
    startLoop();
  }

  function loadSettings() {
    try { const s=JSON.parse(localStorage.getItem('dd_settings')||'{}'); settings={...settings,...s}; camMode=settings.camera||'highway'; } catch(e){}
  }
  function saveSettings() { settings.camera=camMode; localStorage.setItem('dd_settings',JSON.stringify(settings)); }

  const keys = {};
  function setupInput() {
    window.addEventListener('keydown', e => {
      keys[e.code]=true;
      if(e.code==='KeyP'||e.code==='Escape') togglePause();
      if(e.code==='Space'&&state==='playing'){e.preventDefault();nitroActive=true;Audio.playNitroStart();}
    });
    window.addEventListener('keyup', e => {
      keys[e.code]=false;
      if(e.code==='Space') nitroActive=false;
    });

    const tl=document.getElementById('touch-left');
    const tr=document.getElementById('touch-right');

    ['touchstart','mousedown'].forEach(ev=>{
      tl.addEventListener(ev,e=>{e.preventDefault();if(state==='playing')Player.setSteer(true,false);},{passive:false});
      tr.addEventListener(ev,e=>{e.preventDefault();if(state==='playing')Player.setSteer(false,true);},{passive:false});
    });
    ['touchend','touchcancel','mouseup'].forEach(ev=>{
      tl.addEventListener(ev,()=>{ if(!keys['ArrowRight']&&!keys['KeyD']) Player.setSteer(false,false); });
      tr.addEventListener(ev,()=>{ if(!keys['ArrowLeft']&&!keys['KeyA'])  Player.setSteer(false,false); });
    });
  }

  function enableTouchZones(on) {
    document.getElementById('touch-left').classList.toggle('game-active', on);
    document.getElementById('touch-right').classList.toggle('game-active', on);
  }

  function start() {
    camMode=settings.camera||'highway';
    frameCount=0; distance=0; score=0; speed=BASE_SPEED;
    nitro=1; nitroActive=false;
    nearMissCount=0; nearMissTimer=999; cameraShake=0; paused=false;
    state='playing';
    Player.reset(W,H,camMode);
    Traffic.reset();
    Achievements.sessionReset();
    Audio.startEngine();
    enableTouchZones(true);
    UI.showHUD(true);
    UI.hideOverlay('overlay-pause');
    UI.hideOverlay('overlay-gameover');
    UI.showScreen(null);
  }

  function togglePause() {
    if(state==='playing'){
      paused=true; state='paused';
      UI.showOverlay('overlay-pause');
      Audio.stopEngine();
      enableTouchZones(false);
    } else if(state==='paused'){
      paused=false; state='playing';
      UI.hideOverlay('overlay-pause');
      Audio.startEngine();
      enableTouchZones(true);
    }
  }

  function quit() {
    state='menu'; paused=false;
    nitroActive=false;
    Audio.stopEngine();
    enableTouchZones(false);
    Player.setSteer(false,false);
    UI.showHUD(false);
    UI.hideOverlay('overlay-pause');
    UI.hideOverlay('overlay-gameover');
    UI.showScreen('screen-menu');
    UI.updateMenuBest();
  }

  function endGame() {
    state='gameover';
    Audio.stopEngine();
    Audio.playCollision();
    enableTouchZones(false);
    const best=Math.max(Math.round(distance),parseInt(localStorage.getItem('dd_best')||'0'));
    localStorage.setItem('dd_best',best);
    Achievements.check(distance,nearMissCount,score);
    document.getElementById('goDistance').textContent=Math.round(distance)+' m';
    document.getElementById('goScore').textContent=score.toLocaleString();
    document.getElementById('goBest').textContent=best+' m';
    UI.showOverlay('overlay-gameover');
    if(settings.vibration&&navigator.vibrate) navigator.vibrate([80,40,200]);
  }

  function startLoop() {
    function loop(ts){
      requestAnimationFrame(loop);
      const dt=Math.min(ts-lastTime,50); lastTime=ts;
      tick(dt); render();
    }
    requestAnimationFrame(loop);
  }

  function tick(dt) {
    if(state!=='playing') return;
    frameCount++;
    const targetSpeed=Math.min(MAX_SPEED, BASE_SPEED+frameCount*0.0025);
    speed=Utils.lerp(speed,targetSpeed,0.018);
    if(nitroActive&&nitro>0){
      speed=Math.min(MAX_SPEED,speed*1.55);
      nitro=Math.max(0,nitro-0.006);
      if(nitro<=0) nitroActive=false;
    } else {
      nitro=Math.min(1,nitro+0.0018);
    }
    distance+=speed*0.21; score+=Math.round(speed*0.75);
    Road.update(speed);
    Player.setSteer(keys['ArrowLeft']||keys['KeyA'], keys['ArrowRight']||keys['KeyD']);
    Player.update(W,H,camMode,speed);
    Traffic.update(speed,frameCount,Road.getLaneCount());
    if(!Player.isInvincible()){
      const hit=Traffic.checkCollision(Player.getX(),Player.getY(),Player.getW(),Player.getH(),camMode,H);
      if(hit){
        Player.spawnCollisionSparks();
        Player.makeInvincible(110);
        Traffic.removeVehicle(hit);
        cameraShake=20; UI.flashScreen();
        if(settings.vibration&&navigator.vibrate) navigator.vibrate([60,20,120]);
        endGame(); return;
      }
      const nm=Traffic.checkNearMiss(Player.getX(),Player.getY(),Player.getW(),Player.getH(),camMode,H);
      if(nm&&nearMissTimer>50){
        nearMissTimer=0; nearMissCount++; score+=50;
        Player.spawnNearMissSparks();
        Audio.playNearMiss(); UI.showNearMiss();
        Achievements.onNearMiss(nearMissCount);
        if(settings.vibration&&navigator.vibrate) navigator.vibrate(30);
      }
    }
    if(nearMissTimer<999) nearMissTimer++;
    if(cameraShake>0){cameraShake*=0.86; if(cameraShake<0.4) cameraShake=0;}
    Audio.updateEngine(speed/MAX_SPEED,nitroActive);
    UI.updateHUD(Math.round(distance),score,Math.round(speed*6),nitro);
  }

  function render() {
    ctx.clearRect(0,0,W,H);
    const drawing = state==='playing'||state==='paused'||state==='gameover';
    const drawRoad = state==='menu'||drawing;
    if(!drawRoad) return;
    if(state==='menu') Road.update(1.0);
    if(cameraShake>0.4){ctx.save();ctx.translate((Math.random()-0.5)*cameraShake*2,(Math.random()-0.5)*cameraShake*1.2);}
    if(camMode==='topdown'){Road.drawTopDown(ctx,W,H,speed);if(drawing){Traffic.drawTopDown(ctx,H);Player.draw(ctx,camMode);}}
    else{Road.drawHighway(ctx,W,H,speed);if(drawing){Traffic.drawHighway(ctx);Player.draw(ctx,camMode);}}
    if(drawing&&speed>11){const a=Utils.clamp((speed-11)/6,0,0.2);drawSpeedLines(a);}
    if(cameraShake>0.4) ctx.restore();
    drawVignette();
    if(state==='menu'){ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,H);}
  }

  function drawSpeedLines(alpha){
    ctx.save(); ctx.globalAlpha=alpha;
    const cx=W/2,cy=H*0.48;
    for(let i=0;i<10;i++){
      const a=(i/10)*Math.PI*2, len=80+Math.random()*120, r0=W*0.22;
      ctx.strokeStyle='rgba(170,140,255,0.5)'; ctx.lineWidth=0.9;
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);
      ctx.lineTo(cx+Math.cos(a)*(r0+len),cy+Math.sin(a)*(r0+len)); ctx.stroke();
    }
    ctx.restore();
  }

  function drawVignette(){
    const vg=ctx.createRadialGradient(W/2,H/2,H*0.22,W/2,H/2,H*0.82);
    vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.5)');
    ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
  }

  function setCamMode(m){camMode=m;settings.camera=m;saveSettings();}
  function getCamMode(){return camMode;}
  function getSettings(){return settings;}
  function setSetting(k,v){settings[k]=v;saveSettings();}

  return {init,start,togglePause,quit,setCamMode,getCamMode,getSettings,setSetting};
})();
