/* matching.js - turning what the player typed into an answer: forgiving exact matches, and "did you mean...?" typo help. */
(function (CX) {
  "use strict";

  const strip = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/['’`]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  /* words players may leave off: "saint peter" = "peter", "the good samaritan" = "good samaritan" ... */
  const PREFIX = /^(the|saint|st|pope|book of|gospel of|gospel according to|epistle to the|epistle of|letter to the|parable of the|parable of|mount|mt|feast of|feast of the|council of|first council of) /;
  const variants = s => {
    const out = new Set([s]);
    let cur = s, m;
    while ((m = PREFIX.exec(cur))) { cur = cur.slice(m[0].length); out.add(cur); }
    return out;
  };

  /* edit distance, giving up early once it exceeds `max` */
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let best = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        best = Math.min(best, cur[j]);
      }
      if (best > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  /* every typed form of every answer in a question, built once and remembered */
  const indexes = new Map();
  function indexFor(cat) {
    if (indexes.has(cat.id)) return indexes.get(cat.id);
    const map = new Map();
    cat.entries.forEach(e => e.a.forEach(a => variants(a).forEach(v => { if (v && !map.has(v)) map.set(v, e); })));
    indexes.set(cat.id, map);
    return map;
  }

  /* exact match (after forgiving the words above) -> the answer, or null */
  function match(cat, raw) {
    const q = strip(raw);
    if (q.length < 2) return null;
    const map = indexFor(cat);
    for (const v of variants(q)) if (map.has(v)) return map.get(v);
    return null;
  }

  /* close but not exact -> the single best candidate to offer as a correction, or null */
  function suggest(cat, raw) {
    const q = strip(raw);
    if (q.length < 3) return null;
    const map = indexFor(cat);
    let best = null, bd = 99, tie = false;
    const consider = (e, d) => { if (d < bd) { best = e; bd = d; tie = false; } else if (d === bd && e !== best) tie = true; };
    for (const v of variants(q)) {
      const tol = v.length >= 12 ? 3 : v.length >= 8 ? 2 : v.length >= 4 ? 1 : 0;
      for (const [k, e] of map) {
        if (k.length < 3) continue;
        const d = lev(v, k, tol);
        if (d <= tol) consider(e, d);
        else if (v.length >= 4 && k.startsWith(v)) consider(e, 1.5);      // typed only the start of it
      }
    }
    return tie ? null : best;
  }

  CX.matching = { match, suggest };
})(window.CX = window.CX || {});
