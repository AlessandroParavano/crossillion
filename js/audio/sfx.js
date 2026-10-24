/* audio/sfx.js - every sound effect, as a short recipe. Each recipe plays notes with voice() (a tone) and noise() (whoosh,
   crackle, hiss).  To add a sound: add a recipe below, then call  CX.sfx.play("yourName")  wherever it should happen.
   The "sound lab" page (dev/sound-lab.html) plays every recipe so you can hear and tune them. */
(function (CX) {
  "use strict";
  const A = () => CX.audio;
  const m = n => A().midi(n);

  /* a run of notes, evenly spaced: notes = MIDI numbers (60 = middle C) */
  function run(t, notes, gap, o) {
    notes.forEach((n, i) => A().voice({ wave: "pulse25", f: m(n), t: t + i * gap, d: o.d ?? 0.16, g: o.g ?? 0.085, send: o.send ?? 0.15 }));
    notes.forEach((n, i) => A().voice({ type: "triangle", f: m(n - 12), t: t + i * gap, d: (o.d ?? 0.16) * 1.2, g: (o.g ?? 0.085) * 0.9 }));
  }

  const recipes = {
    /* ---- interface ---- */
    click(t)   { A().voice({ type: "square", f: m(84), to: m(72), t, d: 0.06, g: 0.15 }); },
    toggle(t)  { A().voice({ type: "square", f: m(76), t, d: 0.05, g: 0.13 }); A().voice({ type: "square", f: m(83), t: t + 0.06, d: 0.07, g: 0.13 }); },
    ok(t)      { run(t, [79, 86], 0.09, { d: 0.14 }); },

    /* ---- the 3-2-1 countdown and the clock ---- */
    count(t, n) { A().voice({ type: "square", f: m({ 3: 72, 2: 76, 1: 79 }[n] || 72), t, d: 0.13, g: 0.17 }); },
    go(t)       { run(t, [79, 84, 91], 0.07, { d: 0.14, g: 0.08 }); },
    lowtime(t, sec) { A().voice({ type: "square", f: 1500 - sec * 130, t, d: 0.045, g: 0.14 }); },     // ticks faster-sounding as time runs out
    timeout(t) {
      A().voice({ type: "sawtooth", f: 220, to: 90, t, d: 0.55, g: 0.1, vib: [9, 6], lp: 1800 });
      A().noise({ type: "lowpass", f: 900, to: 150, t, d: 0.4, g: 0.05 });
    },

    /* ---- answering ---- */
    reject(t)  { [0, 0.11].forEach(x => A().voice({ type: "sawtooth", f: 150, to: 105, t: t + x, d: 0.09, g: 0.09, lp: 900 })); },
    suggest(t) { A().voice({ type: "triangle", f: m(76), t, d: 0.09, g: 0.1 }); A().voice({ type: "triangle", f: m(83), t: t + 0.1, d: 0.16, g: 0.1, send: 0.2 }); },

    /* the reward jingle for each tier: longer and brighter the rarer the answer. arg = tier number 0..5 */
    tier(t, i) {
      const S = [[67], [67, 71], [67, 71, 74], [67, 71, 74, 79], [67, 71, 74, 79, 83, 86], [60, 64, 67, 72, 76, 79, 84, 88]];
      const notes = S[Math.max(0, Math.min(5, i | 0))];
      run(t, notes, i >= 5 ? 0.075 : 0.085, { d: 0.17 + 0.03 * i, g: 0.08, send: 0.1 + 0.08 * i });
      if (i >= 4) {                                               // sparkle on the good ones
        for (let k = 0; k < 6; k++) A().voice({ type: "sine", f: m(96 + (k * 5) % 12), t: t + 0.12 + k * 0.05, d: 0.25, g: 0.035, send: 0.5 });
      }
      if (i >= 5) {                                               // top tier: a held chord and a rising shimmer
        [60, 67, 72, 76, 79].forEach(n => A().voice({ wave: "pulse25", f: m(n), t: t + 0.6, d: 1.4, g: 0.045, hold: true, r: 0.8, send: 0.4 }));
        A().noise({ type: "bandpass", f: 600, to: 5000, q: 2, t, d: 0.9, g: 0.05 });
      }
    },

    /* the camera sinking to the new depth. arg = meters gained */
    descend(t, meters) {
      const d = 0.9 + Math.min(1, (meters || 100) / 1000) * 0.9, g = 0.03 + Math.min(1, (meters || 100) / 1000) * 0.05;
      A().noise({ type: "bandpass", f: 1800, to: 180, q: 1.2, t: t + 0.05, d, g, a: 0.08 });
      A().voice({ type: "sine", f: 190, to: 62, t: t + 0.05, d, g: g * 1.8, a: 0.05 });
    },

    /* ---- places and moments ---- */
    start(t) {                                                      // the plunge at the start of a game
      A().noise({ type: "bandpass", f: 3200, to: 220, q: 1, t, d: 1.0, g: 0.06 });
      A().voice({ type: "sine", f: 520, to: 110, t, d: 0.9, g: 0.09 });
      [84, 79, 72].forEach((n, i) => A().voice({ wave: "pulse25", f: m(n), t: t + i * 0.08, d: 0.12, g: 0.05 }));
    },
    zone(t, i) {                                                    // a sonar ping when a new zone's title appears
      const base = [86, 84, 79, 74, 91][i | 0] ?? 86;
      A().voice({ type: "sine", f: m(base), t, d: 1.6, g: 0.1, a: 0.006, send: 0.65 });
      A().voice({ type: "sine", f: m(base - 5), t: t + 0.2, d: 1.3, g: 0.05, send: 0.65 });
    },
    end(t, depth) {                                                 // the result screen: an arpeggio, richer the deeper you went
      const deep = Math.min(1, (depth || 0) / 7000);
      run(t, [60, 64, 67, 72], 0.1, { d: 0.2, g: 0.075 });
      [60, 64, 67, 72, 76].slice(0, 3 + Math.round(deep * 2)).forEach(n => A().voice({ wave: "pulse25", f: m(n), t: t + 0.5, d: 1.5, g: 0.04, hold: true, r: 0.9, send: 0.4 }));
    },

    /* ---- the cross ---- */
    holy(t) {                                                       // a bell, then a shimmer of notes rising
      [1, 2.01, 2.76, 4.07, 5.4].forEach((r, i) => A().voice({ type: "sine", f: m(84) * r, t, d: 2.4 / (1 + i * 0.6), g: 0.09 / (1 + i * 0.7), a: 0.004, send: 0.6 }));
      [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => A().voice({ type: "sine", f: m(n), t: t + 0.08 + i * 0.085, d: 1.1, g: 0.04, send: 0.6 }));
      A().noise({ type: "highpass", f: 6000, q: 0.5, t: t + 0.05, d: 1.2, g: 0.018, a: 0.2 });
    },
    verse(t) {                                                      // a soft chord when the verse card opens
      [60, 64, 67, 72].forEach(n => A().voice({ type: "triangle", f: m(n), t, d: 1.8, g: 0.04, a: 0.18, hold: true, r: 1.0, send: 0.5 }));
    },
    burn(t) {                                                       // the Burning Bush: rumble, crackle and a rising roar
      A().voice({ type: "sine", f: 55, to: 48, t, d: 2.8, g: 0.12, a: 0.15, hold: true, r: 1.2 });
      A().noise({ type: "lowpass", f: 200, to: 2600, q: 0.8, t, d: 1.6, g: 0.06, a: 0.25 });
      const crackles = [0.05, 0.19, 0.3, 0.52, 0.61, 0.83, 0.98, 1.2, 1.31, 1.55, 1.8, 1.97, 2.2, 2.4];
      crackles.forEach((x, i) => A().noise({ type: "bandpass", f: 1800 + (i * 937) % 4200, q: 3, t: t + x, d: 0.045, g: 0.07, off: i * 0.37 }));
    },
  };

  /* play a sound by name. Does nothing until the player has clicked once, or if effects are switched off. */
  function play(name, arg) {
    const a = CX.audio;
    if (!a.ready || !a.sfxOn) return;
    const r = recipes[name];
    if (!r) return;
    try { r(a.ctx.currentTime, arg); } catch (e) { /* a sound must never break the game */ }
  }

  CX.sfx = { play, recipes, names: () => Object.keys(recipes) };
})(window.CX = window.CX || {});
