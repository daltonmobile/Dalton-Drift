// ═══════════════════════════════════════════
// ui.js — Screen transitions + asset injection + HUD
// ═══════════════════════════════════════════

const UI = (() => {

  // Inject real image assets into DOM elements
  function injectAssets() {
    const set = (id, key) => {
      const el = document.getElementById(id);
      if (el && Assets[key]) el.src = Assets[key];
    };
    set('menuLogoImg',     'logo');
    set('menuHeroImg',     'hero');
    set('camHighwayThumb', 'cam_highway');
    set('camTopdownThumb', 'cam_topdown');
    set('playBtnImg',      'btn_play');
    set('hudNitroImg',     'nitro_btn');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (id) {
      const el = document.getElementById(id);
      if (el) el.classList.add('active');
    }
  }

  function showOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  function showHUD(visible) {
    document.getElementById('hud').classList.toggle('hidden', !visible);
  }

  function updateHUD(dist, score, speed, nitro) {
    document.getElementById('hudDist').innerHTML  = dist + '<span class="hud-unit">m</span>';
    document.getElementById('hudScore').textContent = score.toLocaleString();
    document.getElementById('hudSpeed').textContent = speed;
    document.getElementById('nitroFill').style.width = (nitro * 100) + '%';
  }

  let nearMissTO = null;
  function showNearMiss() {
    const el = document.getElementById('nearMissPopup');
    el.classList.add('show');
    clearTimeout(nearMissTO);
    nearMissTO = setTimeout(() => el.classList.remove('show'), 1100);
  }

  function flashScreen() {
    const el = document.getElementById('flash-overlay');
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 90);
  }

  function updateMenuBest() {
    const best = localStorage.getItem('dd_best') || '0';
    const el = document.getElementById('menuBest');
    if (el) el.textContent = 'BEST: ' + Math.round(best) + ' m';
  }

  function selectCam(el, mode) {
    document.querySelectorAll('.cam-thumb').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    Game.setCamMode(mode);
  }

  function toggleSetting(key) {
    const s = Game.getSettings();
    if (key === 'sound') {
      s.sound = !s.sound;
      Audio.setEnabled(s.sound);
      Game.setSetting('sound', s.sound);
      const btn = document.getElementById('toggleSound');
      btn.textContent = s.sound ? 'ON' : 'OFF';
      btn.classList.toggle('off', !s.sound);
    } else if (key === 'vibration') {
      s.vibration = !s.vibration;
      Game.setSetting('vibration', s.vibration);
      const btn = document.getElementById('toggleVibration');
      btn.textContent = s.vibration ? 'ON' : 'OFF';
      btn.classList.toggle('off', !s.vibration);
    } else if (key === 'camera') {
      const mode = Game.getCamMode() === 'highway' ? 'topdown' : 'highway';
      Game.setCamMode(mode);
      document.getElementById('toggleCamera').textContent = mode === 'highway' ? 'HIGHWAY' : 'TOP-DOWN';
      // Sync cam buttons on menu too
      document.querySelectorAll('.cam-thumb').forEach(b => {
        b.classList.toggle('active', b.dataset.cam === mode);
      });
    }
  }

  function syncSettingsUI() {
    const s = Game.getSettings();
    document.getElementById('toggleSound').textContent     = s.sound     ? 'ON' : 'OFF';
    document.getElementById('toggleVibration').textContent = s.vibration ? 'ON' : 'OFF';
    document.getElementById('toggleCamera').textContent    = (s.camera || 'highway') === 'highway' ? 'HIGHWAY' : 'TOP-DOWN';
    document.getElementById('toggleSound').classList.toggle('off',     !s.sound);
    document.getElementById('toggleVibration').classList.toggle('off', !s.vibration);
  }

  return {
    injectAssets, showScreen, showOverlay, hideOverlay,
    showHUD, updateHUD, showNearMiss, flashScreen,
    updateMenuBest, selectCam, toggleSetting, syncSettingsUI,
  };
})();
