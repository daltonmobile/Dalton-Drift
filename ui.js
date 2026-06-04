// ═══════════════════════════════════════════
// ui.js — Screen transitions + HUD updates
// ═══════════════════════════════════════════

const UI = (() => {

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
    const hud = document.getElementById('hud');
    if (visible) hud.classList.remove('hidden');
    else         hud.classList.add('hidden');
  }

  function updateHUD(dist, score, speed) {
    document.getElementById('hudDist').innerHTML  = dist + '<span>m</span>';
    document.getElementById('hudScore').textContent = score.toLocaleString();
    document.getElementById('hudSpeed').textContent = speed;
  }

  let nearMissTO = null;
  function showNearMiss() {
    const el = document.getElementById('nearMissPopup');
    el.classList.add('show');
    clearTimeout(nearMissTO);
    nearMissTO = setTimeout(() => el.classList.remove('show'), 1100);
  }

  function updateMenuBest() {
    const best = localStorage.getItem('dd_best') || '0';
    document.getElementById('menuBest').textContent = 'Best: ' + Math.round(best) + ' m';
  }

  function selectCam(el, mode) {
    document.querySelectorAll('.cam-option').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    Game.setCamMode(mode);
  }

  function toggleSetting(key) {
    const s = Game.getSettings();
    if (key === 'sound') {
      s.sound = !s.sound;
      Audio.setEnabled(s.sound);
      Game.setSetting('sound', s.sound);
      document.getElementById('toggleSound').textContent = s.sound ? 'ON' : 'OFF';
      document.getElementById('toggleSound').classList.toggle('off', !s.sound);
    } else if (key === 'vibration') {
      s.vibration = !s.vibration;
      Game.setSetting('vibration', s.vibration);
      document.getElementById('toggleVibration').textContent = s.vibration ? 'ON' : 'OFF';
      document.getElementById('toggleVibration').classList.toggle('off', !s.vibration);
    } else if (key === 'camera') {
      const mode = Game.getCamMode() === 'highway' ? 'topdown' : 'highway';
      Game.setCamMode(mode);
      document.getElementById('toggleCamera').textContent = mode === 'highway' ? 'HIGHWAY' : 'TOP-DOWN';
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

  return { showScreen, showOverlay, hideOverlay, showHUD, updateHUD, showNearMiss, updateMenuBest, selectCam, toggleSetting, syncSettingsUI };
})();
