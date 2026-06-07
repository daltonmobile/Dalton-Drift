// player.js
const Player = (() => {
  const CAR_W=68, CAR_H=110;
  let x,y,velX=0,driftAngle=0,invincibleFrames=0;
  let smoke=[],sparks=[],steerLeft=false,steerRight=false;
  let frameCount=0;
  const STEER=8,RETURN=0.72,MAX_VEL=11,DRIFT=0.015;

  function reset(W,H,cam){x=W/2;y=defY(H,cam);velX=0;driftAngle=0;invincibleFrames=0;smoke=[];sparks=[];frameCount=0;}
  function defY(H,cam){return cam==='topdown'?H*0.76:H*0.80;}
  function setSteer(l,r){steerLeft=l;steerRight=r;}

  function update(W,H,cam,speed){
    frameCount++;
    if(steerLeft) velX-=STEER;
    else if(steerRight) velX+=STEER;
    else velX*=RETURN;
    velX=Utils.clamp(velX,-MAX_VEL,MAX_VEL);
    x+=velX;
    driftAngle=Utils.lerp(driftAngle,velX*DRIFT,0.14);
    const rL=cam==='topdown'?Road.getTdRoadL()+CAR_W/2+2:W*0.05+CAR_W/2;
    const rR=cam==='topdown'?Road.getTdRoadR()-CAR_W/2-2:W*0.95-CAR_W/2;
    if(x<rL){x=rL;velX*=-0.15;}
    if(x>rR){x=rR;velX*=-0.15;}
    y=defY(H,cam);
    if(invincibleFrames>0) invincibleFrames--;
    if(Math.abs(velX)>3&&speed>4){
      smoke.push({x:x+(Math.random()-0.5)*28,y:y+CAR_H*0.38,
        vx:(Math.random()-0.5)*1.4,vy:0.8+Math.random()*0.8,r:6+Math.random()*5,life:1});
    }
    smoke=smoke.filter(p=>p.life>0);
    sparks=sparks.filter(p=>p.life>0);
    smoke.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.r+=0.8;p.life-=0.022;});
    sparks.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;p.life-=0.036;});
  }

  function spawnCollisionSparks(){
    for(let i=0;i<24;i++){
      const a=Math.random()*Math.PI*2,s=3+Math.random()*10;
      sparks.push({x:x+(Math.random()-0.5)*40,y:y+(Math.random()-0.5)*50,
        vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,r:2+Math.random()*3,life:1,
        color:Math.random()>0.5?'#fbbf24':'#ff4444'});
    }
  }
  function spawnNearMissSparks(){
    for(let i=0;i<10;i++)
      sparks.push({x:x+(Math.random()-0.5)*50,y:y+(Math.random()-0.5)*24,
        vx:(Math.random()-0.5)*6,vy:-Math.random()*5,r:2.5,life:1,color:'#fbbf24'});
  }

  function makeInvincible(f){invincibleFrames=f||110;}
  function isInvincible(){return invincibleFrames>0;}

  function draw(ctx, cam, nitroActive){
    // Smoke
    smoke.forEach(p=>{
      ctx.save();ctx.globalAlpha=p.life*0.5;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
      g.addColorStop(0,'rgba(210,200,230,0.7)');g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      ctx.restore();
    });

    // Nitro flames before car
    if(nitroActive){
      Sprites.drawNitroFlames(ctx, x, y, frameCount);
    }

    const blink=invincibleFrames>0&&Math.floor(invincibleFrames/5)%2===0;
    if(!blink) Sprites.drawPlayer(ctx,x,y,CAR_W*1.85,CAR_H*1.45,driftAngle,cam);

    // Sparks
    sparks.forEach(p=>{
      ctx.save();ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
      ctx.shadowBlur=10;ctx.shadowColor=p.color;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;ctx.restore();
    });
  }

  function getX(){return x;}function getY(){return y;}
  function getW(){return CAR_W;}function getH(){return CAR_H;}
  function getDrift(){return driftAngle;}

  return{reset,update,draw,setSteer,spawnCollisionSparks,spawnNearMissSparks,
    makeInvincible,isInvincible,getX,getY,getW,getH,getDrift};
})();
