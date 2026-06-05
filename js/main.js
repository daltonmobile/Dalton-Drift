// ═══════════════════════════════════════════
// main.js — Bootstrap + asset loading screen
// ═══════════════════════════════════════════

window.addEventListener('DOMContentLoaded', () => {
  Achievements.load();
  Achievements.renderList();
  Game.init();

  // Animate loading bar while sprites preload
  let fakeProgress = 0;
  const bar  = document.getElementById('loadingBar');
  const txt  = document.getElementById('loadingText');
  const tick = setInterval(() => {
    fakeProgress = Math.min(fakeProgress + Math.random() * 8, 88);
    if (bar) bar.style.width = fakeProgress + '%';
  }, 80);

  Sprites.preload(() => {
    clearInterval(tick);
    if (bar) bar.style.width = '100%';
    if (txt) txt.textContent = 'Ready!';

    setTimeout(() => {
      // Inject assets into DOM img tags
      UI.injectAssets();
      UI.syncSettingsUI();

      // Sync cam buttons
      const storedCam = Game.getCamMode();
      document.querySelectorAll('.cam-thumb').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cam === storedCam);
      });

      UI.showScreen('screen-menu');
      UI.updateMenuBest();

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
      }
    }, 300);
  });
});
