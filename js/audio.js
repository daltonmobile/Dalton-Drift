// audio.js — Web Audio engine (V8/inline-6 sound)
const Audio = (() => {
  let actx, masterGain, engineGain;
  let osc1, osc2, osc3, oscSub;
  let dist, filt;
  let enabled = true;

  function init() {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = actx.createGain(); masterGain.gain.value = 1;
      masterGain.connect(actx.destination);
      engineGain = actx.createGain(); engineGain.gain.value = 0;

      dist = actx.createWaveShaper();
      const N = 512, c = new Float32Array(N);
      for (let i=0;i<N;i++){const x=(i*2/N)-1;c[i]=(Math.PI+180)*x/(Math.PI+180*Math.abs(x));}
      dist.curve = c;

      filt = actx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 600; filt.Q.value = 1.2;

      oscSub = actx.createOscillator(); oscSub.type = 'sine';    oscSub.frequency.value = 38;
      osc1   = actx.createOscillator(); osc1.type   = 'sawtooth';osc1.frequency.value   = 72;
      osc2   = actx.createOscillator(); osc2.type   = 'square';  osc2.frequency.value   = 144;
      osc3   = actx.createOscillator(); osc3.type   = 'sawtooth';osc3.frequency.value   = 108;

      const g0=actx.createGain();g0.gain.value=0.55;
      const g1=actx.createGain();g1.gain.value=0.45;
      const g2=actx.createGain();g2.gain.value=0.18;
      const g3=actx.createGain();g3.gain.value=0.12;

      oscSub.connect(g0); g0.connect(engineGain);
      osc1.connect(g1);   g1.connect(dist);
      osc2.connect(g2);   g2.connect(dist);
      osc3.connect(g3);   g3.connect(dist);
      dist.connect(filt); filt.connect(engineGain);
      engineGain.connect(masterGain);

      oscSub.start(); osc1.start(); osc2.start(); osc3.start();
    } catch(e) { console.warn('Audio init failed', e); }
  }

  function resume() { if (actx && actx.state === 'suspended') actx.resume(); }

  function updateEngine(norm, nitroOn) {
    if (!actx || !osc1) return;
    const now = actx.currentTime;
    const freq = 38 + Utils.easeIn(norm) * (nitroOn ? 260 : 190);
    osc1.frequency.setTargetAtTime(freq,     now, 0.06);
    osc2.frequency.setTargetAtTime(freq*2.0, now, 0.06);
    osc3.frequency.setTargetAtTime(freq*1.5, now, 0.06);
    oscSub.frequency.setTargetAtTime(freq*0.5, now, 0.08);
    engineGain.gain.setTargetAtTime(enabled ? (0.05 + norm*0.22) : 0, now, 0.08);
    filt.frequency.setTargetAtTime(350 + norm*1800, now, 0.1);
  }

  function oneShot(freq, type, dur, vol, endFreq) {
    if (!actx || !enabled) return;
    const o=actx.createOscillator(), g=actx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol;
    o.connect(g); g.connect(masterGain);
    o.start();
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, actx.currentTime+dur);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime+dur);
    o.stop(actx.currentTime+dur+0.01);
  }

  function playCollision() {
    oneShot(110,'square',0.4,0.5,28);
    oneShot(60,'sawtooth',0.3,0.3,20);
  }
  function playNearMiss()  { oneShot(800,'sine',0.18,0.12,1200); }
  function playNitroStart(){ oneShot(180,'sawtooth',0.3,0.2,360); }

  function setEnabled(v) {
    enabled = v;
    if (masterGain) masterGain.gain.setTargetAtTime(v?1:0, actx.currentTime, 0.1);
  }

  function startEngine() { init(); resume(); }
  function stopEngine()  { if (engineGain) engineGain.gain.setTargetAtTime(0, actx.currentTime, 0.4); }

  return { startEngine, stopEngine, updateEngine, setEnabled, playCollision, playNearMiss, playNitroStart };
})();
