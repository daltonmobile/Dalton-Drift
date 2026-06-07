// road.js — Road rendering with real background images
const Road = (() => {
  let W, H, offset=0, bgOffset=0, frameCount=0;
  const LANE_COUNT = 4;

  // Highway perspective coords
  const HORIZON_Y  = () => H * 0.38;
  const ROAD_L_TOP = () => W * 0.5 - 55;
  const ROAD_R_TOP = () => W * 0.5 + 55;
  const ROAD_L_BOT = () => W * 0.02;
  const ROAD_R_BOT = () => W * 0.98;

  // Top-down coords
  const TD_ROAD_L = () => W * 0.12;
  const TD_ROAD_R = () => W * 0.88;
  const TD_ROAD_W = () => TD_ROAD_R() - TD_ROAD_L();
  const TD_LANE_W = () => TD_ROAD_W() / LANE_COUNT;

  // Background cycling — rotates through skyline images
  const BG_HIGHWAY = ['skyline_main','skyline_1','skyline_2','skyline_3',
                      'highway_env_1','highway_env_2','highway_env_3'];
  const BG_SKYBOX  = ['skybox_1','skybox_2','skybox_3'];
  let bgIndex = 0, lastBgSwitch = 0;

  let stars=[], buildings=[];

  function initStars() {
    stars=[];
    for (let i=0;i<200;i++)
      stars.push({x:Math.random(),y:Math.random(),s:Math.random()*1.6+0.3,b:Math.random(),sp:Math.random()*0.003+0.001,phase:0});
  }
  function postInitStars() { stars.forEach(s=>s.phase=Math.random()*Math.PI*2); }

  function initBuildings() {
    buildings=[];
    for (let side=0;side<2;side++) {
      for (let i=0;i<14;i++) {
        const bw=0.04+Math.random()*0.05;
        buildings.push({
          side, x:side===0?Math.random()*0.10+0.01:Math.random()*0.10+0.89,
          bw, bh:0.14+Math.random()*0.26, baseY:0.62+Math.random()*0.38,
          hue:Math.random()>0.5?270:195, windows:buildWindows(bw),
        });
      }
    }
  }
  function buildWindows(bw) {
    const wins=[], cols=Math.max(2,Math.round(bw*160));
    for (let r=0;r<8;r++) for (let c=0;c<cols;c++)
      wins.push({r,c,on:Math.random()>0.35,phase:Math.random()*Math.PI*2});
    return wins;
  }

  function update(spd) {
    offset=(offset+spd)%1000;
    bgOffset=(bgOffset+spd*0.18)%H;
    frameCount++;
    stars.forEach(s=>s.b=(Math.sin(frameCount*s.sp*60+s.phase)+1)*0.5);
    // Switch background every ~12 seconds at normal speed
    if (frameCount - lastBgSwitch > 720) {
      bgIndex = (bgIndex+1) % BG_HIGHWAY.length;
      lastBgSwitch = frameCount;
    }
  }

  // Try to draw a real image, fallback to gradient
  function drawBgImage(ctx, key, x, y, w, h, alpha) {
    const imgs = typeof Sprites !== 'undefined' ? Sprites._imgs : null;
    // Access loaded images via Sprites module
    const img = Sprites.getImg(key);
    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = alpha || 1;
      const iAsp = img.naturalWidth / img.naturalHeight;
      const bAsp = w / h;
      let dw=w, dh=h, dx=x, dy=y;
      if (iAsp > bAsp) { dh=h; dw=h*iAsp; dx=x+(w-dw)/2; }
      else             { dw=w; dh=w/iAsp; dy=y+(h-dh)/2; }
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
      return true;
    }
    return false;
  }

  function drawSky(ctx, maxY) {
    // Try real skyline image first
    const drawn = drawBgImage(ctx, BG_HIGHWAY[bgIndex], 0, 0, W, maxY, 1.0);
    if (!drawn) {
      // Fallback gradient sky
      const sky=ctx.createLinearGradient(0,0,0,maxY);
      sky.addColorStop(0,'#020008'); sky.addColorStop(0.7,'#0e0022'); sky.addColorStop(1,'#180038');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,maxY);
    }
    // Always draw stars on top (blended)
    ctx.save(); ctx.globalAlpha = drawn ? 0.5 : 1.0;
    stars.forEach(s=>{
      ctx.fillStyle=`rgba(255,255,255,${(0.2+s.b*0.7).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(s.x*W,s.y*maxY*0.88,s.s*(0.5+s.b*0.5),0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  function drawBuildings(ctx, maxY) {
    // Only draw canvas buildings if no real background image loaded
    const img = Sprites.getImg(BG_HIGHWAY[bgIndex]);
    if (img && img.complete && img.naturalWidth) return; // real image handles this
    buildings.forEach(b=>{
      const bx=b.x*W, bw=b.bw*W, bh=b.bh*maxY, by=maxY-bh;
      ctx.fillStyle='#080012'; ctx.fillRect(bx-bw/2,by,bw,bh);
      const wCols=Math.max(1,Math.round(bw/9)), wRows=Math.max(1,Math.round(bh/14));
      const wPX=bw*0.12, wPY=8, wW=(bw-wPX*2)/wCols, wH=(bh-wPY*2)/wRows;
      b.windows.forEach((win,idx)=>{
        if(!win.on) return;
        const col=idx%wCols, row=Math.floor(idx/wCols);
        if(row>=wRows||wW-2<1||wH-2<1) return;
        const flicker=Math.sin(win.phase+frameCount*0.015)>-0.95;
        if(!flicker) return;
        ctx.fillStyle=b.hue===270?'rgba(190,150,255,0.7)':'rgba(120,220,255,0.65)';
        ctx.shadowBlur=3; ctx.shadowColor=b.hue===270?'#a855f7':'#38bdf8';
        ctx.fillRect(bx-bw/2+wPX+col*wW+1,by+wPY+row*wH+1,wW-2,wH-2);
      });
      ctx.shadowBlur=0;
    });
  }

  // ── HIGHWAY ──────────────────────────────────────────────
  function drawHighway(ctx, w, h, spd) {
    W=w; H=h;
    const HY=HORIZON_Y(), RLT=ROAD_L_TOP(), RRT=ROAD_R_TOP(), RLB=ROAD_L_BOT(), RRB=ROAD_R_BOT();

    drawSky(ctx, HY);
    drawBuildings(ctx, HY+4);

    // Road surface
    const rg=ctx.createLinearGradient(W/2,HY,W/2,H);
    rg.addColorStop(0,'#0c0c10'); rg.addColorStop(0.5,'#101014'); rg.addColorStop(1,'#141418');
    ctx.fillStyle=rg;
    ctx.beginPath(); ctx.moveTo(RLT,HY); ctx.lineTo(RRT,HY); ctx.lineTo(RRB,H); ctx.lineTo(RLB,H); ctx.closePath(); ctx.fill();

    // Wet sheen
    const sh=ctx.createLinearGradient(W/2,HY,W/2,H);
    sh.addColorStop(0,'rgba(138,43,226,0)'); sh.addColorStop(0.6,'rgba(138,43,226,0.05)'); sh.addColorStop(1,'rgba(0,229,255,0.07)');
    ctx.fillStyle=sh;
    ctx.beginPath(); ctx.moveTo(RLT,HY); ctx.lineTo(RRT,HY); ctx.lineTo(RRB,H); ctx.lineTo(RLB,H); ctx.closePath(); ctx.fill();

    // Edge neon barriers
    ctx.lineWidth=3; ctx.shadowBlur=10; ctx.shadowColor='#ff2d78';
    const bL=ctx.createLinearGradient(0,HY,0,H);
    bL.addColorStop(0,'rgba(255,45,120,0)'); bL.addColorStop(1,'rgba(255,45,120,0.3)');
    ctx.strokeStyle=bL;
    ctx.beginPath(); ctx.moveTo(RLT,HY); ctx.lineTo(RLB,H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(RRT,HY); ctx.lineTo(RRB,H); ctx.stroke();
    ctx.shadowBlur=0;

    // Lane lines
    for (let l=1;l<LANE_COUNT;l++) {
      const frac=l/LANE_COUNT;
      const bx=RLT+(RRT-RLT)*frac, tx=RLB+(RRB-RLB)*frac;
      for (let d=0;d<18;d++) {
        const t0=((d/18)+offset/400)%1, t1=t0+0.025;
        if(t1>1) continue;
        const x0=bx+(tx-bx)*t0, y0=HY+(H-HY)*t0;
        const x1=bx+(tx-bx)*t1, y1=HY+(H-HY)*t1;
        ctx.strokeStyle=`rgba(255,210,50,${(t0*0.6).toFixed(2)})`;
        ctx.lineWidth=t0*3+0.5;
        ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
      }
    }

    // Horizon glow
    const hg=ctx.createRadialGradient(W/2,HY,0,W/2,HY,W*0.5);
    hg.addColorStop(0,'rgba(157,78,221,0.2)'); hg.addColorStop(1,'transparent');
    ctx.fillStyle=hg; ctx.fillRect(0,HY-30,W,60);
  }

  // ── TOP-DOWN ─────────────────────────────────────────────
  function drawTopDown(ctx, w, h, spd) {
    W=w; H=h;

    // Try skybox as top-down background
    const skyDrawn = drawBgImage(ctx, BG_SKYBOX[bgIndex % BG_SKYBOX.length], 0, 0, W, H, 0.35);
    if (!skyDrawn) {
      ctx.fillStyle='#07070f'; ctx.fillRect(0,0,W,H);
    }

    // Side areas
    const sL=ctx.createLinearGradient(0,0,TD_ROAD_L(),0);
    sL.addColorStop(0,'rgba(3,0,12,0.92)'); sL.addColorStop(1,'rgba(9,0,26,0.88)');
    ctx.fillStyle=sL; ctx.fillRect(0,0,TD_ROAD_L(),H);
    const sR=ctx.createLinearGradient(TD_ROAD_R(),0,W,0);
    sR.addColorStop(0,'rgba(9,0,26,0.88)'); sR.addColorStop(1,'rgba(3,0,12,0.92)');
    ctx.fillStyle=sR; ctx.fillRect(TD_ROAD_R(),0,W-TD_ROAD_R(),H);

    // Stars
    stars.forEach(s=>{
      const sx=s.x<0.5?s.x*TD_ROAD_L()*1.6:TD_ROAD_R()+(s.x-0.5)*(W-TD_ROAD_R())*1.6;
      const sy=(s.y*H+bgOffset)%H;
      ctx.fillStyle=`rgba(200,180,255,${(0.1+s.b*0.35).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(sx,sy,s.s*0.7,0,Math.PI*2); ctx.fill();
    });

    // Road
    const ag=ctx.createLinearGradient(TD_ROAD_L(),0,TD_ROAD_R(),0);
    ag.addColorStop(0,'#0f0f14'); ag.addColorStop(0.5,'#131318'); ag.addColorStop(1,'#0f0f14');
    ctx.fillStyle=ag; ctx.fillRect(TD_ROAD_L(),0,TD_ROAD_W(),H);

    // Road edges
    ctx.lineWidth=2.5; ctx.shadowBlur=14; ctx.shadowColor='#ff2d78';
    ctx.strokeStyle='#ff2d78';
    ctx.beginPath(); ctx.moveTo(TD_ROAD_L(),0); ctx.lineTo(TD_ROAD_L(),H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(TD_ROAD_R(),0); ctx.lineTo(TD_ROAD_R(),H); ctx.stroke();
    ctx.shadowBlur=0;

    // Lane dividers
    const dashLen=44, dashGap=22, total=dashLen+dashGap, doff=offset%total;
    ctx.strokeStyle='rgba(255,200,40,0.4)'; ctx.lineWidth=2;
    ctx.setLineDash([dashLen,dashGap]); ctx.lineDashOffset=-doff;
    for (let l=1;l<LANE_COUNT;l++) {
      const lx=TD_ROAD_L()+l*TD_LANE_W();
      ctx.beginPath(); ctx.moveTo(lx,0); ctx.lineTo(lx,H); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.lineDashOffset=0;

    // Centre glow
    const cx=(TD_ROAD_L()+TD_ROAD_R())/2;
    const cg=ctx.createLinearGradient(cx-6,0,cx+6,0);
    cg.addColorStop(0,'transparent'); cg.addColorStop(0.5,'rgba(138,43,226,0.08)'); cg.addColorStop(1,'transparent');
    ctx.fillStyle=cg; ctx.fillRect(cx-6,0,12,H);
  }

  // ── Helpers ──────────────────────────────────────────────
  function highwayCarPos(lane, normY) {
    const frac=(lane+0.5)/LANE_COUNT;
    const RLT=ROAD_L_TOP(),RRT=ROAD_R_TOP(),RLB=ROAD_L_BOT(),RRB=ROAD_R_BOT(),HY=HORIZON_Y();
    const bx=RLT+(RRT-RLT)*frac, tx=RLB+(RRB-RLB)*frac;
    return {
      x: bx+(tx-bx)*normY,
      y: HY+(H-HY)*normY,
      scale: 0.15+normY*1.1
    };
  }

  function getTdLaneX(l) { return TD_ROAD_L()+(l+0.5)*TD_LANE_W(); }
  function getHorizonY() { return HORIZON_Y(); }
  function getLaneCount(){ return LANE_COUNT; }
  function getTdRoadL()  { return TD_ROAD_L(); }
  function getTdRoadR()  { return TD_ROAD_R(); }
  function getOffset()   { return offset; }

  return { update, drawHighway, drawTopDown, initStars, postInitStars, initBuildings,
           getHorizonY, getLaneCount, highwayCarPos, getTdLaneX, getTdRoadL, getTdRoadR, getOffset };
})();
