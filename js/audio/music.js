/* audio/music.js - generative chiptune music: one short looping theme for each zone, played by a tiny scheduler.
   The music follows the zone you are in and cross-fades when you sink into a new one.

   A theme is plain data plus one function that schedules a single 4-beat bar:
       { name, bpm, root (MIDI note, 60 = middle C), scale, chords: [scale degree per bar...], bar(b, k) {...} }
   Inside bar(): `b.at(beat)` is when a beat happens, `b.n(degree, octave)` is a note's MIDI number, `k` is the bar number.
   To change the music: edit a theme's numbers, or add a theme and point a zone at it with `music: <index>` in config.js. */
(function (CX) {
  "use strict";
  const A = () => CX.audio;
  const m = n => A().midi(n);
  const SCALES = {
    major:    [0, 2, 4, 5, 7, 9, 11],
    minor:    [0, 2, 3, 5, 7, 8, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian:   [0, 2, 4, 6, 7, 9, 11],
  };
  /* scale degree (1 = root; 8 = root an octave up; 0 = the note below) -> MIDI note */
  function note(root, scale, d) {
    const s = SCALES[scale], i = d - 1, oct = Math.floor(i / 7);
    return root + s[((i % 7) + 7) % 7] + 12 * oct;
  }
  const mus = o => A().voice({ bus: "music", ...o });
  const hiss = o => A().noise({ bus: "music", ...o });

  const themes = [
    /* 0 - The Sunday Street: bright, bouncy, hopeful (C major) */
    { name: "Sunday Street", bpm: 100, root: 60, scale: "major", chords: [1, 5, 6, 4],
      bar(b, k) {
        const c = this.chords[k % 4], tones = [c, c + 2, c + 4];
        [[0, c, 2, 0.38], [1, c, 3, 0.2], [2, c + 4, 2, 0.38], [3, c, 2, 0.2]].forEach(([beat, d, oct, dur]) =>
          mus({ type: "triangle", f: m(b.n(d, oct)), t: b.at(beat), d: dur, g: 0.13 }));                          // bouncing bass
        [0, 1, 2, 1, 0, 1, 2, 1].forEach((x, i) =>
          mus({ wave: "pulse25", f: m(b.n(tones[x], 5)), t: b.at(i / 2), d: b.spb * 0.45, g: 0.045, send: 0.2 })); // sparkling arpeggio
        const tune = [[[0, 5, 2], [2, 3, 1], [3, 5, 1], [4, 8, 3]], [[0, 7, 2], [2, 5, 1], [3, 7, 1], [4, 9, 3]],
                      [[0, 8, 2], [2, 6, 1], [3, 8, 1], [4, 10, 3]], [[0, 9, 2], [2, 8, 1], [3, 6, 1], [4, 5, 2], [6, 4, 2]]][k % 4];
        tune.forEach(([step, d, len]) => mus({ wave: "pulse50", f: m(b.n(d, 4)), t: b.at(step / 2), d: len * b.spb * 0.5 * 0.92, g: 0.06, send: 0.25 }));
        [0, 2].forEach(beat => mus({ type: "sine", f: 130, to: 45, t: b.at(beat), d: 0.15, g: 0.1 }));             // kick
        [0.5, 1.5, 2.5, 3.5].forEach(beat => hiss({ type: "highpass", f: 7000, t: b.at(beat), d: 0.03, g: 0.016 })); // hi-hat
      } },

    /* 1 - The Nave: a slow organ in a stone church (D major) */
    { name: "Nave", bpm: 64, root: 62, scale: "major", chords: [1, 4, 1, 5, 6, 4, 5, 1],
      bar(b, k) {
        const c = this.chords[k % 8], len = 4 * b.spb;
        [c, c + 2, c + 4].forEach((d, i) => [-5, 5].forEach(det =>
          mus({ type: "square", f: m(b.n(d, 4)), detune: det, t: b.t, d: len, a: 0.1, hold: true, r: 0.4, g: 0.02, lp: 1400, vib: [5.2, 2.5] })));
        mus({ type: "triangle", f: m(b.n(c, 2)), t: b.t, d: len, a: 0.06, hold: true, r: 0.35, g: 0.1 });         // pedal bass
        mus({ type: "sine", f: m(b.n(c + 4, 6)), t: b.at(0), d: 1.7, g: 0.04, send: 0.65 });                      // bells
        mus({ type: "sine", f: m(b.n(c + 2, 6)), t: b.at(2), d: 1.3, g: 0.032, send: 0.65 });
      } },

    /* 2 - The Crypt: a cold drone, echoing notes, wind (A minor) */
    { name: "Crypt", bpm: 52, root: 57, scale: "minor", chords: [1, 1, 6, 7],
      bar(b, k) {
        const len = 4 * b.spb;
        mus({ type: "sine", f: m(b.n(1, 2)), t: b.t, d: len, a: 0.6, hold: true, r: 0.9, g: 0.09 });
        mus({ type: "triangle", f: m(b.n(5, 3)), t: b.t, d: len, a: 0.8, hold: true, r: 0.9, g: 0.04, lp: 700 });
        const drift = [[[0, 1, 5, 1.6]], [[2, 3, 5, 1.4]], [[1, 5, 5, 1.2], [3, 4, 5, 1.4]], [[0, 7, 4, 1.8]]][k % 4];
        drift.forEach(([beat, d, oct, dur]) => mus({ wave: "pulse12", f: m(b.n(d, oct)), t: b.at(beat), d: dur, g: 0.042, send: 0.85 }));
        hiss({ type: "bandpass", f: 380, to: 520, q: 1.3, t: b.t, d: len, a: 1.2, hold: true, r: 1.5, g: 0.02 });       // wind
        if (k % 4 === 0) mus({ type: "sine", f: 70, to: 45, t: b.t, d: 0.6, g: 0.1 });                              // distant thump
      } },

    /* 3 - The Catacombs: a heartbeat, a dissonant hum, dripping water (E phrygian) */
    { name: "Catacombs", bpm: 44, root: 52, scale: "phrygian", chords: [1, 2, 1, 1],
      bar(b, k) {
        const len = 4 * b.spb;
        mus({ type: "sine", f: 62, to: 38, t: b.at(0), d: 0.24, g: 0.17 });                                         // lub-dub
        mus({ type: "sine", f: 58, to: 36, t: b.at(0) + 0.3, d: 0.22, g: 0.11 });
        [1, 2].forEach(d => mus({ type: "triangle", f: m(b.n(d, 3)), t: b.t, d: len, a: 1.2, hold: true, r: 1.4, g: 0.028, lp: 900, detune: d === 2 ? 7 : -4 }));
        const drips = [[[1.5, 5, 6]], [[3, 2, 6]], [[0.5, 3, 6], [2.5, 7, 5]], [[2, 1, 6]]][k % 4];
        drips.forEach(([beat, d, oct]) => mus({ type: "sine", f: m(b.n(d, oct)), t: b.at(beat), d: 0.9, g: 0.036, send: 0.9 }));
        if (k % 4 === 3) hiss({ type: "lowpass", f: 280, to: 900, t: b.at(1), d: 2.2, a: 0.9, hold: true, r: 1.0, g: 0.03 });   // a slow breath
      } },

    /* 4 - The Holy of Holies: a choir of light (F lydian) */
    { name: "Holy of Holies", bpm: 74, root: 65, scale: "lydian", chords: [1, 2, 5, 1],
      bar(b, k) {
        const c = this.chords[k % 4], len = 4 * b.spb;
        [c, c + 2, c + 4, c + 7].forEach(d => [-6, 6].forEach(det =>
          mus({ type: "sine", f: m(b.n(d, 4)), detune: det, t: b.t, d: len, a: 0.35, hold: true, r: 1.0, g: 0.04, send: 0.5 })));   // the choir
        [c, c + 2, c + 4, c + 7, c + 9, c + 7, c + 4, c + 2].forEach((d, i) =>
          mus({ type: "triangle", f: m(b.n(d, 5)), t: b.at(i / 2), d: b.spb * 0.9, g: 0.026, send: 0.75 }));                       // shimmering arpeggio
        mus({ type: "sine", f: m(b.n(c, 2)), t: b.t, d: len, a: 0.1, hold: true, r: 0.6, g: 0.1 });
        [1, 2.76].forEach((r, i) => mus({ type: "sine", f: m(b.n(c + 4, 6)) * r, t: b.at(0), d: 2.0 / (1 + i), g: 0.03 / (1 + i), send: 0.7 }));   // a bell
      } },
  ];

  /* ---------- the scheduler: keeps the next ~0.7 s of music queued ahead of the audio clock ---------- */
  let timer = null, running = false, on = true, cur = -1, want = 0, nextT = 0, barN = 0, switching = false;
  const themeFor = zone => { const z = CX.config.zones[zone]; return Math.min(themes.length - 1, z && z.music != null ? z.music : zone); };
  const helper = (th, t) => ({ t, spb: 60 / th.bpm, at: beat => t + (beat * 60) / th.bpm, n: (d, oct = 4) => note(th.root, th.scale, d) + 12 * (oct - 4) });

  function scheduleBar(index, k, t) { const th = themes[index]; th.bar(helper(th, t), k); }

  function pump() {
    const c = A().ctx;
    if (!c || switching || !on || cur < 0) return;
    while (nextT < c.currentTime + 0.7) {
      const th = themes[cur];
      th.bar(helper(th, nextT), barN++);
      nextT += (4 * 60) / th.bpm;
    }
  }

  function start(zone) {
    if (running || !A().ready) return;
    running = true; want = themeFor(zone); cur = want; barN = 0; nextT = A().ctx.currentTime + 0.1;
    on = CX.audio.musicOn;
    timer = setInterval(pump, 120);
    pump();
  }

  /* the player moved into a new zone: fade the old theme out, bring the new one in */
  function setZone(zone) {
    want = themeFor(zone);
    if (!running || want === cur || switching) return;
    switching = true;
    const f = A().out.fade.gain, c = A().ctx;
    f.cancelScheduledValues(c.currentTime); f.setValueAtTime(f.value, c.currentTime); f.linearRampToValueAtTime(0.0001, c.currentTime + 0.5);
    setTimeout(() => {
      cur = want; barN = 0; nextT = c.currentTime + 0.05; switching = false;
      f.cancelScheduledValues(c.currentTime); f.setValueAtTime(0.0001, c.currentTime); f.linearRampToValueAtTime(1, c.currentTime + 0.9);
      pump();
    }, 520);
  }

  function setOn(flag) {
    on = flag;
    if (flag && running) { nextT = Math.max(nextT, A().ctx.currentTime + 0.1); pump(); }
  }

  /* stop the music completely (the sound lab uses this) */
  function stop() {
    if (!running) return;
    running = false; clearInterval(timer);
    const f = A().out.fade.gain, c = A().ctx;
    f.cancelScheduledValues(c.currentTime); f.setValueAtTime(f.value, c.currentTime); f.linearRampToValueAtTime(0.0001, c.currentTime + 0.25);
    setTimeout(() => { f.cancelScheduledValues(c.currentTime); f.setValueAtTime(1, c.currentTime); }, 400);
  }

  CX.music = { start, stop, setZone, setOn, scheduleBar, themes };
})(window.CX = window.CX || {});
