// ═══════════════════════════════════════════
// main.js — Bootstrap
// ═══════════════════════════════════════════

window.addEventListener('DOMContentLoaded', () => {
  // Add flash overlay for collisions
  const flash = document.createElement('div');
  flash.id = 'flash-overlay';
  document.getElementById('app').appendChild(flash);

  // Load persistent data
  Achievements.load();
  Achievements.renderList();

  // Init game engine
  Game.init();

  // Sync settings UI to stored prefs
  UI.syncSettingsUI();

  // Sync cam buttons to stored cam mode
  const storedCam = Game.getCamMode();
  document.querySelectorAll('.cam-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cam === storedCam);
  });

  // Show menu
  UI.showScreen('screen-menu');
  UI.updateMenuBest();

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
});
