// ui.js
const UI = (() => {
  function injectAssets(){
    const s=(id,k)=>{const e=document.getElementById(id);if(e&&Assets[k])e.src=Assets[k];};
    s('menuLogoImg','logo');s('menuHeroImg','hero_racer');
    s('camHighwayThumb','cam_highway');s('camTopdownThumb','cam_topdown');
    s('playBtnImg','btn_play');s('hudNitroImg','nitro_btn');
  }

  function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    if(id){const e=document.getElementById(id);if(e)e.classList.add('active');}
  }
  function showOverlay(id){const e=document.getElementById(id);if(e)e.classList.remove('hidden');}
  function hideOverlay(id){const e=document.getElementById(id);if(e)e.classList.add('hidden');}
  function showHUD(v){document.getElementById('hud').classList.toggle('hidden',!v);}

  function updateHUD(dist,score,speed,nitro){
    document.getElementById('hudDist').innerHTML=dist+'<span class="hud-unit">m</span>';
    document.getElementById('hudScore').textContent=score.toLocaleString();
    document.getElementById('hudSpeed').textContent=speed;
    document.getElementById('nitroFill').style.width=(nitro*100)+'%';
  }

  let nmTO=null;
  function showNearMiss(){
    const e=document.getElementById('nearMissPopup');
    e.classList.add('show');clearTimeout(nmTO);
    nmTO=setTimeout(()=>e.classList.remove('show'),1100);
  }

  function flashScreen(){
    const e=document.getElementById('flash-overlay');if(!e)return;
    e.classList.add('flash');setTimeout(()=>e.classList.remove('flash'),90);
  }

  function updateMenuBest(){
    const el=document.getElementById('menuBest');
    if(el)el.textContent='BEST: '+Math.round(localStorage.getItem('dd_best')||0)+' m';
  }

  function selectCam(el,mode){
    document.querySelectorAll('.cam-thumb').forEach(b=>b.classList.remove('active'));
    el.classList.add('active');Game.setCamMode(mode);
  }

  function toggleSetting(key){
    const s=Game.getSettings();
    if(key==='sound'){
      s.sound=!s.sound;Audio.setEnabled(s.sound);Game.setSetting('sound',s.sound);
      const b=document.getElementById('toggleSound');b.textContent=s.sound?'ON':'OFF';b.classList.toggle('off',!s.sound);
    }else if(key==='vibration'){
      s.vibration=!s.vibration;Game.setSetting('vibration',s.vibration);
      const b=document.getElementById('toggleVibration');b.textContent=s.vibration?'ON':'OFF';b.classList.toggle('off',!s.vibration);
    }else if(key==='camera'){
      const modes=['highway','topdown','dashboard'];
      const cur=Game.getCamMode();
      const m=modes[(modes.indexOf(cur)+1)%modes.length];
      Game.setCamMode(m);
      const labels={highway:'HIGHWAY',topdown:'TOP-DOWN',dashboard:'DASHBOARD'};
      document.getElementById('toggleCamera').textContent=labels[m];
      document.querySelectorAll('.cam-thumb').forEach(b=>b.classList.toggle('active',b.dataset.cam===m));
    }
  }

  function syncSettingsUI(){
    const s=Game.getSettings();
    document.getElementById('toggleSound').textContent=s.sound?'ON':'OFF';
    document.getElementById('toggleVibration').textContent=s.vibration?'ON':'OFF';
    const camLabels={highway:'HIGHWAY',topdown:'TOP-DOWN',dashboard:'DASHBOARD'};
    document.getElementById('toggleCamera').textContent=camLabels[s.camera||'highway']||'HIGHWAY';
    document.getElementById('toggleSound').classList.toggle('off',!s.sound);
    document.getElementById('toggleVibration').classList.toggle('off',!s.vibration);
  }

  return{injectAssets,showScreen,showOverlay,hideOverlay,showHUD,updateHUD,
    showNearMiss,flashScreen,updateMenuBest,selectCam,toggleSetting,syncSettingsUI};
})();
