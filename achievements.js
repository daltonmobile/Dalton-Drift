// ═══════════════════════════════════════════
// achievements.js
// ═══════════════════════════════════════════

const Achievements = (() => {

  const DEFS = [
    { id: 'first_run',   icon: '🏁', name: 'First Run',      desc: 'Complete your first run',          check: (d) => d >= 1 },
    { id: 'dist_500',    icon: '📍', name: 'Street Racer',   desc: 'Survive 500m',                     check: (d) => d >= 500 },
    { id: 'dist_1000',   icon: '🛣️', name: 'Highway Star',   desc: 'Survive 1000m',                    check: (d) => d >= 1000 },
    { id: 'dist_2500',   icon: '🌆', name: 'Night Drifter',  desc: 'Survive 2500m',                    check: (d) => d >= 2500 },
    { id: 'dist_5000',   icon: '🏆', name: 'Drift Legend',   desc: 'Survive 5000m',                    check: (d) => d >= 5000 },
    { id: 'near_miss_3', icon: '💨', name: 'Living Dangerously', desc: '3 near misses in one run',     check: (d, nm) => nm >= 3 },
    { id: 'near_miss_10',icon: '⚡', name: 'Ghost Driver',   desc: '10 near misses in one run',        check: (d, nm) => nm >= 10 },
    { id: 'score_5k',    icon: '💰', name: 'Big Scorer',     desc: 'Score 5000 points',                check: (d, nm, s) => s >= 5000 },
    { id: 'score_20k',   icon: '💎', name: 'Perfectionist',  desc: 'Score 20,000 points',              check: (d, nm, s) => s >= 20000 },
  ];

  let unlocked = {};
  let nearMissSession = 0;

  function load() {
    try { unlocked = JSON.parse(localStorage.getItem('dd_ach') || '{}'); } catch(e) { unlocked = {}; }
  }

  function save() {
    localStorage.setItem('dd_ach', JSON.stringify(unlocked));
  }

  function check(dist, nearMisses, score) {
    DEFS.forEach(a => {
      if (!unlocked[a.id] && a.check(dist, nearMisses, score)) {
        unlocked[a.id] = Date.now();
      }
    });
    save();
    renderList();
  }

  function onNearMiss() {
    nearMissSession++;
    check(0, nearMissSession, 0);
  }

  function sessionReset() { nearMissSession = 0; }

  function renderList() {
    const el = document.getElementById('achievementList');
    if (!el) return;
    el.innerHTML = '';
    DEFS.forEach(a => {
      const isUnlocked = !!unlocked[a.id];
      const div = document.createElement('div');
      div.className = 'achievement-item' + (isUnlocked ? ' unlocked' : '');
      div.innerHTML = `
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-info">
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
        <div class="achievement-badge">${isUnlocked ? '✅' : '🔒'}</div>
      `;
      el.appendChild(div);
    });
  }

  return { load, check, onNearMiss, sessionReset, renderList };
})();
