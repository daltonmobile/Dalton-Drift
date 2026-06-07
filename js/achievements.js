// achievements.js
const Achievements = (() => {
  const DEFS = [
    {id:'first_run',  icon:'🏁',name:'First Run',      desc:'Complete your first run',       check:(d)=>d>=1},
    {id:'dist_500',   icon:'📍',name:'Street Racer',   desc:'Survive 500m',                  check:(d)=>d>=500},
    {id:'dist_1000',  icon:'🛣️',name:'Highway Star',   desc:'Survive 1,000m',                check:(d)=>d>=1000},
    {id:'dist_2500',  icon:'🌆',name:'Night Drifter',  desc:'Survive 2,500m',                check:(d)=>d>=2500},
    {id:'dist_5000',  icon:'🏆',name:'Drift Legend',   desc:'Survive 5,000m',                check:(d)=>d>=5000},
    {id:'nearmiss_3', icon:'💨',name:'Living Dangerously',desc:'3 near misses in one run',   check:(d,n)=>n>=3},
    {id:'nearmiss_10',icon:'⚡',name:'Ghost Driver',   desc:'10 near misses in one run',     check:(d,n)=>n>=10},
    {id:'score_5k',   icon:'💰',name:'Big Scorer',     desc:'Score 5,000 points',            check:(d,n,s)=>s>=5000},
    {id:'score_25k',  icon:'💎',name:'Perfectionist',  desc:'Score 25,000 points',           check:(d,n,s)=>s>=25000},
  ];
  let unlocked={}, nmSession=0;

  function load(){try{unlocked=JSON.parse(localStorage.getItem('dd_ach')||'{}');}catch(e){unlocked={};}}
  function save(){localStorage.setItem('dd_ach',JSON.stringify(unlocked));}

  function check(dist,nm,score){
    let changed=false;
    DEFS.forEach(a=>{if(!unlocked[a.id]&&a.check(dist,nm,score)){unlocked[a.id]=Date.now();changed=true;}});
    if(changed)save();
    renderList();
  }

  function onNearMiss(n){nmSession=n;check(0,nmSession,0);}
  function sessionReset(){nmSession=0;}

  function renderList(){
    const el=document.getElementById('achievementList');
    if(!el)return;
    el.innerHTML='';
    DEFS.forEach(a=>{
      const on=!!unlocked[a.id];
      const d=document.createElement('div');
      d.className='achievement-item'+(on?' unlocked':'');
      d.innerHTML=`<div class="achievement-icon">${a.icon}</div>
        <div class="achievement-info">
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.desc}</div>
        </div>
        <div class="achievement-badge">${on?'✅':'🔒'}</div>`;
      el.appendChild(d);
    });
  }

  return{load,check,onNearMiss,sessionReset,renderList};
})();
