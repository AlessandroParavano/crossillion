/* audio/engine.js - the sound system's foundation. Everything is synthesised with the Web Audio API: no sound files.

   Output chain:   voices -> [sfx | music] -> master -> limiter -> speakers      (and an echo "send" for space)
   Browsers only allow sound after a click or key press, so the audio starts on the player's first interaction.
   js/audio/sfx.js holds the sound effects, js/audio/music.js holds the music. */
(function (CX) {
  "use strict";
  const { $ } = CX;

  const state = { sfx: CX.store.get("sfx", true), music: CX.store.get("music", true) };
  let ctx = null, out = null;
  const waves = new WeakMap(), noises = new WeakMap();

  /* ---------- the output chain on a given AudioContext (also used for offline test renders) ---------- */
  function bind(context) {
    ctx = context;
    const master = ctx.createGain(); master.gain.value = 0.85;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.knee.value = 10; limiter.ratio.value = 8; limiter.attack.value = 0.003; limiter.release.value = 0.2;
    master.connect(limiter); limiter.connect(ctx.destination);

    const sfx = ctx.createGain(); sfx.gain.value = state.sfx ? 1 : 0; sfx.connect(master);
    const musicLevel = ctx.createGain(); musicLevel.gain.value = state.music ? 1 : 0;       // on/off
    const music = ctx.createGain(); music.gain.value = 0.42;                                // overall music loudness
    const duck = ctx.createGain(); duck.gain.value = 1;                                     // lowered while a dialog is open
    const fade = ctx.createGain(); fade.gain.value = 1;                                     // used when the zone changes
    music.connect(fade); fade.connect(duck); duck.connect(musicLevel); musicLevel.connect(master);

    const amb = ctx.createGain();                                                           // echo send: delay with a darkening feedback loop
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.34;
    const fb = ctx.createGain(); fb.gain.value = 0.36;
    const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2400;
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    amb.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(wet); wet.connect(master);

    out = { master, sfx, music, musicLevel, duck, fade, amb };
    return out;
  }

  /* ---------- building blocks used by sfx.js and music.js ---------- */
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  /* a pulse wave with a given duty cycle ("pulse25" = the classic thin chiptune tone) */
  function waveFor(name) {
    let cache = waves.get(ctx); if (!cache) waves.set(ctx, cache = {});
    if (cache[name]) return cache[name];
    const duty = parseInt(name.replace("pulse", ""), 10) / 100, N = 2048, H = 64;
    const re = new Float32Array(H + 1), im = new Float32Array(H + 1);
    for (let n = 1; n <= H; n++) {
      let a = 0, b = 0;
      for (let k = 0; k < N; k++) { const x = (2 * Math.PI * k) / N, f = x < 2 * Math.PI * duty ? 1 : -1; a += f * Math.cos(n * x); b += f * Math.sin(n * x); }
      re[n] = (2 * a) / N; im[n] = (2 * b) / N;
    }
    return (cache[name] = ctx.createPeriodicWave(re, im));
  }

  function noiseBuffer() {
    let b = noises.get(ctx);
    if (!b) {
      b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noises.set(ctx, b);
    }
    return b;
  }

  const target = bus => (bus === "music" ? out.music : out.sfx);

  /* the volume shape of one sound: quick rise, then either a fade-out ("pluck") or a hold then fade ("hold") */
  function envelope(g, t, o) {
    const peak = o.g ?? 0.1, a = o.a ?? 0.004, end = t + o.d;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (o.hold) {
      const r = Math.min(o.r ?? 0.2, o.d - a);
      g.gain.setValueAtTime(peak, end - r);
      g.gain.linearRampToValueAtTime(0.0001, end);
    } else g.gain.exponentialRampToValueAtTime(0.0001, end);
  }

  function route(node, g, o) {
    node.connect(g);
    g.connect(target(o.bus));
    if (o.send) { const s = ctx.createGain(); s.gain.value = o.send; g.connect(s); s.connect(out.amb); }
  }

  /* one note.  f: Hz (or `to` to glide), d: seconds, g: loudness, type: sine|square|triangle|sawtooth or wave: "pulse25",
     a: attack, hold: true for pads, r: release, lp: low-pass Hz, vib: [rate, depth Hz], send: echo amount, bus: "sfx"|"music" */
  function voice(o) {
    if (!ctx || !out) return;
    const t = o.t ?? ctx.currentTime, end = t + o.d;
    const osc = ctx.createOscillator();
    if (o.wave) osc.setPeriodicWave(waveFor(o.wave)); else osc.type = o.type || "square";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide ?? o.d));
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    const g = ctx.createGain();
    envelope(g, t, o);
    let node = osc;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; osc.connect(f); node = f; }
    route(node, g, o);
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(end + 0.05); }
    osc.start(t); osc.stop(end + 0.05);
  }

  /* a burst of filtered noise (whooshes, crackle, wind, hi-hats).  type: bandpass|lowpass|highpass, f: Hz, to: sweep target, q */
  function noise(o) {
    if (!ctx || !out) return;
    const t = o.t ?? ctx.currentTime, end = t + o.d;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || "bandpass"; f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.f, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide ?? o.d));
    const g = ctx.createGain();
    envelope(g, t, o);
    src.connect(f);
    route(f, g, o);
    src.start(t, (o.off ?? 0) % 1.5); src.stop(end + 0.05);
  }

  /* ---------- turning sound on and off ---------- */
  function refreshButtons() {
    [["sfxBtn", state.sfx, "Sound effects"], ["musicBtn", state.music, "Music"]].forEach(([id, on, label]) => {
      const b = $(id); if (!b) return;
      b.setAttribute("aria-pressed", String(on));
      b.title = `${label}: ${on ? "on" : "off"}`;
    });
  }
  function setSfx(on) {
    state.sfx = on; CX.store.set("sfx", on); refreshButtons();
    if (out) out.sfx.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.02);
    if (on) { unlock(); CX.sfx.play("click"); }
  }
  function setMusic(on) {
    state.music = on; CX.store.set("music", on); refreshButtons();
    if (out) out.musicLevel.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.15);
    if (on) unlock();
    CX.music.setOn(on);
  }
  const duck = on => { if (out) out.duck.gain.setTargetAtTime(on ? 0.4 : 1, ctx.currentTime, 0.2); };

  /* ---------- starting the audio (must happen inside a click or key press) ---------- */
  let zoneNow = 0;
  function unlock(opts = {}) {                                   // opts.music = false: the sound lab starts music itself
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { document.body.classList.add("no-audio"); return; }
    try { bind(new AC()); ctx.resume(); } catch { document.body.classList.add("no-audio"); ctx = null; return; }
    if (opts.music !== false) CX.music.start(zoneNow);
  }

  function init() {
    refreshButtons();
    $("sfxBtn").onclick = () => setSfx(!state.sfx);
    $("musicBtn").onclick = () => setMusic(!state.music);
    const first = () => { unlock(); ["pointerdown", "keydown", "touchstart"].forEach(e => document.removeEventListener(e, first, true)); };
    ["pointerdown", "keydown", "touchstart"].forEach(e => document.addEventListener(e, first, true));
    // a little click on every button
    document.addEventListener("click", e => {
      const b = e.target.closest && e.target.closest("button");
      if (!b || b.id === "sfxBtn" || b.id === "musicBtn" || b.closest("#answerForm") || b.classList.contains("sugg")) return;
      CX.sfx.play("click");
    });
    // the music follows the zone you are in; a zone title also gets a sonar ping
    CX.bus.on("zone", e => { zoneNow = e.index; CX.music.setZone(e.index); if (!e.quiet && !e.silent) CX.sfx.play("zone", e.index); });
    // quieter music while a dialog is open
    ["help", "verse"].forEach(id => new MutationObserver(() => duck($(id).open)).observe($(id), { attributes: true, attributeFilter: ["open"] }));
    // silence when the tab is hidden
    document.addEventListener("visibilitychange", () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
  }

  CX.audio = {
    init, bind, unlock, voice, noise, midi, duck, setSfx, setMusic,
    get ctx() { return ctx; }, get out() { return out; },
    get ready() { return !!ctx && !!out; },
    get sfxOn() { return state.sfx; }, get musicOn() { return state.music; },
  };
})(window.CX = window.CX || {});
