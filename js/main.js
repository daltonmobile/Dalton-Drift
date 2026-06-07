// main.js
window.addEventListener('DOMContentLoaded',()=>{
  Achievements.load();Achievements.renderList();
  Game.init();
  let prog=0;
  const bar=document.getElementById('loadingBar');
  const txt=document.getElementById('loadingText');
  const tick=setInterval(()=>{prog=Math.min(prog+Math.random()*9,88);if(bar)bar.style.width=prog+'%';},80);
  Sprites.preload(()=>{
    clearInterval(tick);
    if(bar)bar.style.width='100%';
    if(txt)txt.textContent='Ready!';
    setTimeout(()=>{
      UI.injectAssets();UI.syncSettingsUI();
      const cam=Game.getCamMode();
      document.querySelectorAll('.cam-thumb').forEach(b=>b.classList.toggle('active',b.dataset.cam===cam));
      UI.showScreen('screen-menu');UI.updateMenuBest();
      if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
    },300);
  });
});
