/* rotation.js - which questions a game uses. */
(function (CX) {
  "use strict";
  const DATA = window.CROSSILLION_DATA;
  const ROUNDS = CX.config.rounds;

  /* Endless mode: any 7 different questions at random. */
  function random() {
    const pool = DATA.categories.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, ROUNDS);
  }

  /* Daily mode: everybody gets the same 7 questions on a given (UTC) date.
     The days walk through the WHOLE bank in a shuffled order and only start a new shuffle once every question has
     been used, so a question never comes back until all the others have had their turn. */
  const cycleOrders = [];
  function daily(dateKey) {
    const N = DATA.categories.length;
    const day = Math.floor(Date.parse(dateKey + "T00:00:00Z") / 86400000);
    const GUARD = Math.min(14, Math.floor(N / 3));        // a new cycle never opens with questions that closed the last one
    const shuffled = (c, t) => {
      const r = CX.rng(CX.hashStr(`crossillion-cycle-${c}-${t}`)), a = DATA.categories.map((_, i) => i);
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    };
    const orderOf = c => {
      while (cycleOrders.length <= c) {
        const k = cycleOrders.length, o = shuffled(k, 0);
        if (k > 0) {
          const tail = new Set(cycleOrders[k - 1].slice(-GUARD));
          for (let i = 0; i < GUARD; i++) {
            if (!tail.has(o[i])) continue;
            for (let j = GUARD; j < N - GUARD; j++) if (!tail.has(o[j])) { [o[i], o[j]] = [o[j], o[i]]; break; }
          }
        }
        cycleOrders.push(o);
      }
      return cycleOrders[c];
    };
    const out = [];
    for (let k = 0; k < ROUNDS; k++) {
      const pos = day * ROUNDS + k;
      out.push(DATA.categories[orderOf(Math.floor(pos / N))[pos % N]]);
    }
    return out;
  }

  CX.rotation = { random, daily };
})(window.CX = window.CX || {});
