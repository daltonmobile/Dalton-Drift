// ═══════════════════════════════════════════
// audio.js — Web Audio engine
// Layered oscillators for V8 / inline-6 tone
// ═══════════════════════════════════════════

const Audio = (() => {
  let ctx = null;
  let masterGain, engineGain;
  let osc1, osc2, osc3, oscSub;
  let distNode, filterNode, filterHigh;
  let enabled = true;
  let started = false;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();

      masterGain = ctx.createGain();
      masterGain.gain.value = enabled ? 1 : 0;
      masterGain.connect(ctx.destination);

      engineGain = ctx.createGain();
      engineGain.gain.value = 0;

      // Distortion curve — warm tube overdrive feel
      distNode = ctx.createWaveShaper();
      const N = 512, curve = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const x = (i * 2) / N - 1;
        curve[i] = (Math.PI + 180) * x / (Math.PI + 180 * Math.abs(x));
      }
      distNode.curve = curve;

      // Low-pass — remove harshness
      filterNode = ctx.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.value = 650;
      filterNode.Q.value = 1.2;

      // High-pass — remove very low rumble
      filterHigh = ctx.createBiquadFilter();
      filterHigh.type = 'highpass';
      filterHigh.frequency.value = 40;

      // Sub bass (inertia / V8 low rumble)
      oscSub = ctx.createOscillator();
      oscSub.type = 'sine';
      oscSub.frequency.value = 38;
      const subG = ctx.createGain(); subG.gain.value = 0.55;

      // Mid tone (main exhaust note)
      osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 72;
      const g1 = ctx.createGain(); g1.gain.value = 0.45;

      // Upper harmonic (intake whine)
      osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.value = 144;
      const g2 = ctx.createGain(); g2.gain.value = 0.18;

      // Roughness / character
      osc3 = ctx.createOscillator();
      osc3.type = 'sawtooth';
      osc3.frequency.value = 108;
      const g3 = ctx.createGain(); g3.gain.value = 0.12;

      oscSub.connect(subG);
      osc1.connect(g1);
      osc2.connect(g2);
      osc3.connect(g3);

      subG.connect(filterHigh);
      g1.connect(distNode);
      g2.connect(distNode);
      g3.connect(distNode);
      distNode.connect(filterNode);
      filterNode.connect(engineGain);
      filterHigh.connect(engineGain);
      engineGain.connect(masterGain);

      oscSub.start(); osc1.start(); osc2.start(); osc3.start();
    } catch(e) {
      console.warn('Audio init failed:', e);
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setEnabled(val) {
    enabled = val;
    if (masterGain) masterGain.gain.setTargetAtTime(val ? 1 : 0, ctx.currentTime, 0.1);
  }

  // Call every frame with current speed (0-1 normalised) and nitro bool
  function updateEngine(speedNorm, nitroOn) {
    if (!ctx || !osc1) return;
    const now = ctx.currentTime;

    // RPM model: idle at 700rpm equiv, max ~8000
    const idleFreq = 38;
    const maxFreq  = nitroOn ? 280 : 210;
    const freq = idleFreq + Utils.easeIn(speedNorm) * (maxFreq - idleFreq);

    osc1.frequency.setTargetAtTime(freq, now, 0.06);
    osc2.frequency.setTargetAtTime(freq * 2.0, now, 0.06);
    osc3.frequency.setTargetAtTime(freq * 1.5, now, 0.06);
    oscSub.frequency.setTargetAtTime(freq * 0.5, now, 0.08);

    // Volume ramps with speed
    const vol = 0.06 + speedNorm * 0.22 + (nitroOn ? 0.08 : 0);
    engineGain.gain.setTargetAtTime(vol, now, 0.08);

    // Filter opens up at high rpm (intake roar)
    filterNode.frequency.setTargetAtTime(400 + speedNorm * 1800, now, 0.1);
  }

  function playOneShot(freq, type, duration, gainVal, pitchEnd) {
    if (!ctx || !enabled) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gainVal;
    o.connect(g); g.connect(masterGain);
    o.start();
    if (pitchEnd) o.frequency.exponentialRampToValueAtTime(pitchEnd, ctx.currentTime + duration);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.stop(ctx.currentTime + duration + 0.01);
  }

  function playCollision() {
    if (!ctx || !enabled) return;
    playOneShot(110, 'square', 0.4, 0.5, 28);
    playOneShot(60,  'sawtooth', 0.3, 0.3, 20);
    // Metal scrape noise burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass'; flt.frequency.value = 3000; flt.Q.value = 1;
    const ng = ctx.createGain(); ng.gain.value = 0.35;
    src.connect(flt); flt.connect(ng); ng.connect(masterGain);
    src.start();
  }

  function playNearMiss() {
    if (!ctx || !enabled) return;
    playOneShot(800, 'sine', 0.18, 0.12, 1200);
    playOneShot(400, 'sine', 0.22, 0.08, 200);
  }

  function playNitroStart() {
    if (!ctx || !enabled) return;
    playOneShot(180, 'sawtooth', 0.35, 0.22, 380);
  }

  function startEngine() {
    if (!ctx) init();
    resume();
    started = true;
  }

  function stopEngine() {
    if (!ctx || !engineGain) return;
    engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    started = false;
  }

  return { init, resume, startEngine, stopEngine, updateEngine, setEnabled, playCollision, playNearMiss, playNitroStart };
})();
