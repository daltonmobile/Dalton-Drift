// traffic.js
const Traffic = (() => {
  let vehicles=[], spawnTimer=0, spawnInterval=72;

  function reset() {
    vehicles=[]; spawnTimer=0; spawnInterval=40;
    // Pre-populate road with vehicles at various distances
    // so player sees traffic immediately
  }

  function preSpawn(laneCount, gameSpeed) {
    const normYPositions = [0.25, 0.45, 0.65, 0.20, 0.55];
    normYPositions.forEach((ny, i) => {
      const tdef = Sprites.weightedPick();
      const lane = i % laneCount;
      vehicles.push({...tdef, lane, normY: ny, vy: tdef.speed * gameSpeed * 0.013});
    });
  }

  function spawn(laneCount, gameSpeed) {
    const tdef = Sprites.weightedPick();
    const lane = Math.floor(Math.random()*laneCount);
    if (vehicles.some(v=>v.lane===lane&&v.normY<0.14)) return;
    vehicles.push({...tdef, lane, normY:0, vy:tdef.speed*gameSpeed*0.013});
  }

  function update(gameSpeed, frameCount, laneCount) {
    // Pre-populate on frame 1
    if(frameCount===1) preSpawn(laneCount, gameSpeed);
    spawnTimer++;
    if (spawnTimer>=spawnInterval) {
      spawnTimer=0;
      spawn(laneCount, gameSpeed);
      spawnInterval=Math.max(26,72-Math.floor(frameCount/200));
    }
    vehicles.forEach(v=>{v.normY+=v.vy+gameSpeed*0.0085;});
    vehicles=vehicles.filter(v=>v.normY<=1.12);
  }

  function drawHighway(ctx) {
    [...vehicles].sort((a,b)=>a.normY-b.normY).forEach(v=>{
      const p=Road.highwayCarPos(v.lane,v.normY);
      if(p.y<Road.getHorizonY()) return;
      Sprites.drawTraffic(ctx,p.x,p.y,v.w*p.scale,v.h*p.scale,v.key,v.tdKey,'highway');
    });
  }

  function drawTopDown(ctx, H) {
    vehicles.forEach(v=>{
      Sprites.drawTraffic(ctx,Road.getTdLaneX(v.lane),v.normY*H,v.w,v.h,v.key,v.tdKey,'topdown');
    });
  }

  function checkCollision(px,py,pw,ph,camMode,H) {
    for(const v of vehicles){
      let vx,vy,vw,vh;
      if(camMode==='highway'){
        const p=Road.highwayCarPos(v.lane,v.normY);
        vx=p.x;vy=p.y;vw=v.w*p.scale;vh=v.h*p.scale;
      } else {
        vx=Road.getTdLaneX(v.lane);vy=v.normY*H;vw=v.w;vh=v.h;
      }
      if(Math.abs(vx-px)<(vw+pw)*0.38&&Math.abs(vy-py)<(vh+ph)*0.34) return v;
    }
    return null;
  }

  function checkNearMiss(px,py,pw,ph,camMode,H) {
    for(const v of vehicles){
      let vx,vy,vw,vh;
      if(camMode==='highway'){
        const p=Road.highwayCarPos(v.lane,v.normY);
        vx=p.x;vy=p.y;vw=v.w*p.scale;vh=v.h*p.scale;
      } else {
        vx=Road.getTdLaneX(v.lane);vy=v.normY*H;vw=v.w;vh=v.h;
      }
      const hit=Math.abs(vx-px)<(vw+pw)*0.38&&Math.abs(vy-py)<(vh+ph)*0.34;
      const close=Math.abs(vx-px)<(vw+pw)*0.66&&Math.abs(vy-py)<(vh+ph)*0.57;
      if(close&&!hit) return v;
    }
    return null;
  }

  function removeVehicle(v){vehicles=vehicles.filter(x=>x!==v);}
  function getVehicles(){return vehicles;}

  return{reset,update,drawHighway,drawTopDown,checkCollision,checkNearMiss,removeVehicle,getVehicles};
})();
