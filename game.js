(() => {
  "use strict";
  const DATA = window.CROSSILLION_DATA;
  const ROUNDS = 7, SECONDS = 20;

  const TIERS = {
    schooler:    { name: "Sunday Schooler",      pts: 100,  cls: "t-schooler",    sq: "⬜" },
    churchgoer:  { name: "Churchgoer",           pts: 300,  cls: "t-churchgoer",  sq: "🟩" },
    deepcut:     { name: "Seminarian",           pts: 550,  cls: "t-seminarian",  sq: "🟨" },
    rare:        { name: "Desert Father",        pts: 800,  cls: "t-desert",      sq: "🟧" },
    crossillion: { name: "One in a Crossillion", pts: 1000, cls: "t-crossillion", sq: "🟪" },
  };
  const ZONES = [
    [1500, "The Valley"], [3000, "Hills of Galilee"], [4500, "Mount Sinai"],
    [6000, "Mount Zion"], [Infinity, "The Gates of Heaven"],
  ];
  const MAX = ROUNDS * 1000;
  const zoneOf = h => ZONES.find(z => h < z[0] || z[0] === Infinity)[1];

  const $ = id => document.getElementById(id);
  const show = id => {
    ["screen-start", "screen-game", "screen-end"].forEach(s => $(s).classList.toggle("hidden", s !== id));
    $("altimeter").classList.toggle("hidden", id === "screen-start");
    window.scrollTo(0, 0);
  };
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const fmt = n => n.toLocaleString("en-US");

  /* ---------- text matching ---------- */
  const strip = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/['’`]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const PREFIX = /^(the|saint|st|pope|book of|gospel of|gospel according to|epistle to the|epistle of|letter to the|parable of the|parable of|mount|mt|feast of|feast of the|council of|first council of) /;
  const variants = s => {
    const out = new Set([s]);
    let cur = s, m;
    while ((m = PREFIX.exec(cur))) { cur = cur.slice(m[0].length); out.add(cur); }
    return out;
  };
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
  const indexes = new Map();
  function indexFor(cat) {
    if (indexes.has(cat.id)) return indexes.get(cat.id);
    const map = new Map();
    cat.entries.forEach(e => e.a.forEach(a => variants(a).forEach(v => { if (v && !map.has(v)) map.set(v, e); })));
    indexes.set(cat.id, map);
    return map;
  }
  function match(cat, raw) {
    const q = strip(raw);
    if (q.length < 2) return null;
    const map = indexFor(cat);
    for (const v of variants(q)) if (map.has(v)) return map.get(v);
    for (const v of variants(q)) {           // typo tolerance
      const tol = v.length >= 10 ? 2 : v.length >= 5 ? 1 : 0;
      if (!tol) continue;
      let best = null, bd = tol + 1;
      for (const [k, e] of map) { const d = lev(v, k, tol); if (d < bd) { bd = d; best = e; } }
      if (best) return best;
    }
    return null;
  }

  /* ---------- seeded daily picks ---------- */
  function rng(seed) {
    return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const hashStr = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h; };
  function pickCats(rand) {
    const pool = DATA.categories.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, ROUNDS);
  }

  /* ---------- state ---------- */
  let S = null, timer = null, deadline = 0;

  function start(mode) {
    const key = todayKey();
    if (mode === "daily") {
      const done = store.get("cx.daily." + key);
      if (done) return showEnd(done, true);
    }
    const rand = mode === "daily" ? rng(hashStr("crossillion-" + key)) : Math.random;
    S = { mode, date: key, cats: pickCats(rand), i: 0, height: 0, results: [] };
    $("mode").textContent = mode === "daily" ? "Daily · " + key : "Endless";
    setAlt(0);
    show("screen-game");
    nextQ();
  }

  function setAlt(h) {
    const f = Math.min(h / MAX, 1);
    document.documentElement.style.setProperty("--alt", f.toFixed(3));
    $("altFill").style.height = f * 100 + "%";
    $("altCross").style.bottom = f * 100 + "%";
    $("altNum").textContent = fmt(h);
    $("altZone").textContent = zoneOf(h);
  }

  function nextQ() {
    const cat = S.cats[S.i];
    $("qCount").textContent = `${S.i + 1} / ${ROUNDS}`;
    $("prompt").textContent = cat.prompt;
    $("feedback").textContent = "";
    $("reveal").classList.add("hidden");
    $("answerForm").classList.remove("hidden");
    $("passBtn").classList.remove("hidden");
    const inp = $("answerInput"); inp.value = ""; inp.disabled = false; inp.focus();
    deadline = performance.now() + SECONDS * 1000;
    cancelAnimationFrame(timer);
    const tick = () => {
      const left = deadline - performance.now();
      $("timerBar").style.transform = `scaleX(${Math.max(left, 0) / (SECONDS * 1000)})`;
      $("timerBar").classList.toggle("low", left < 5000);
      if (left <= 0) return resolve(null);
      timer = requestAnimationFrame(tick);
    };
    tick();
  }

  function resolve(entry, typed) {
    cancelAnimationFrame(timer);
    const cat = S.cats[S.i];
    const t = entry ? TIERS[entry.t] : null;
    const gain = t ? t.pts : 0;
    S.height += gain;
    S.results.push({ cat: cat.id, prompt: cat.prompt, entry: entry ? entry.n : null, wiki: entry ? entry.w : null,
      views: entry ? entry.v : 0, rank: entry ? entry.r : 0, total: cat.total, tier: entry ? entry.t : null, gain, typed });
    setAlt(S.height);
    $("answerForm").classList.add("hidden");
    $("passBtn").classList.add("hidden");
    $("feedback").textContent = "";
    const badge = $("revBadge");
    badge.textContent = t ? t.name : "No answer";
    badge.className = "badge " + (t ? t.cls : "");
    $("revGain").textContent = t ? `+${fmt(gain)} cubits` : "+0 cubits";
    $("revAnswer").textContent = entry ? entry.n : "Time ran out or you passed";
    const rarest = cat.entries[cat.entries.length - 1];
    $("revFact").innerHTML = entry
      ? `Ranked <b>#${entry.r}</b> of ${cat.total} answers · looked up about <b>${fmt(entry.v)}</b> times on Wikipedia in the last year.`
      : `The rarest answer we know here is <b>${rarest.n}</b> (about ${fmt(rarest.v)} lookups a year).`;
    $("nextBtn").textContent = S.i === ROUNDS - 1 ? "See result" : "Next";
    $("reveal").classList.remove("hidden");
    $("nextBtn").focus();
  }

  function submit(e) {
    e.preventDefault();
    const cat = S.cats[S.i];
    const raw = $("answerInput").value;
    if (!raw.trim()) return;
    const entry = match(cat, raw);
    if (!entry) {
      const inp = $("answerInput");
      inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake");
      $("feedback").textContent = "Not in our records — try another answer, or pass.";
      return;
    }
    resolve(entry, raw);
  }

  function next() {
    if (S.i === ROUNDS - 1) {
      const out = { mode: S.mode, date: S.date, height: S.height, results: S.results };
      if (S.mode === "daily") store.set("cx.daily." + S.date, out);
      const st = store.get("cx.stats", { played: 0, best: 0, total: 0 });
      st.played++; st.total += S.height; st.best = Math.max(st.best, S.height);
      store.set("cx.stats", st);
      return showEnd(out, false);
    }
    S.i++; nextQ();
  }

  function showEnd(out, replay) {
    S = null; cancelAnimationFrame(timer);
    show("screen-end");
    setAlt(out.height);
    $("endMode").textContent = out.mode === "daily" ? "Today's Ascent · " + out.date : "Endless Mode";
    $("endHeight").textContent = fmt(out.height);
    $("endZone").textContent = "You reached " + zoneOf(out.height);
    $("endGrid").textContent = out.results.map(r => (r.tier ? TIERS[r.tier].sq : "⬛")).join("");
    $("endList").innerHTML = out.results.map(r => {
      const t = r.tier ? TIERS[r.tier] : null;
      const cat = DATA.categories.find(c => c.id === r.cat);
      const rarest = cat ? cat.entries[cat.entries.length - 1] : null;
      return `<li><span class="q">${esc(r.prompt)}</span>
        <span class="a">${r.entry ? esc(r.entry) : "—"}</span>
        <span class="p ${t ? t.cls : ""}">${t ? t.name + " · +" + fmt(r.gain) : "Passed"}</span>
        <span class="d">${r.entry ? `#${r.rank} of ${r.total} · ~${fmt(r.views)} yearly lookups` : ""}${rarest ? ` · Deepest: ${esc(rarest.n)}` : ""}</span></li>`;
    }).join("");
    $("againBtn").style.display = "";
    $("shareMsg").textContent = replay ? "You've already climbed today — come back tomorrow, or try Endless Mode." : "";
    $("nextDaily").textContent = "";
    out._cur = out; window._cx = out;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  async function share() {
    const o = window._cx; if (!o) return;
    const text = `✝️ Crossillion ${o.mode === "daily" ? o.date : "(Endless)"}\n` +
      `${fmt(o.height)} cubits · ${zoneOf(o.height)}\n` +
      o.results.map(r => (r.tier ? TIERS[r.tier].sq : "⬛")).join("") +
      `\n${location.href.split("#")[0]}`;
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); $("shareMsg").textContent = "Copied to clipboard!"; }
    } catch { $("shareMsg").textContent = "Couldn't copy — select and copy manually:\n" + text; }
  }

  /* ---------- start screen ---------- */
  function home() {
    S = null; cancelAnimationFrame(timer);
    document.documentElement.style.setProperty("--alt", "0");
    show("screen-start");
    const done = store.get("cx.daily." + todayKey());
    $("dailyStatus").textContent = done ? `Today's Ascent complete: ${fmt(done.height)} cubits.` : "A new Ascent every day at midnight UTC.";
    $("dailyBtn").textContent = done ? "View Today's Result" : "Today's Ascent";
    const st = store.get("cx.stats", null);
    $("statsLine").textContent = st ? `Climbs: ${st.played} · Best: ${fmt(st.best)} cubits · Average: ${fmt(Math.round(st.total / st.played))}` : "";
  }

  $("dailyBtn").onclick = () => start("daily");
  $("endlessBtn").onclick = () => start("endless");
  $("againBtn").onclick = () => start("endless");
  $("homeBtn").onclick = home;
  $("helpBtn").onclick = () => $("help").showModal();
  $("answerForm").onsubmit = submit;
  $("passBtn").onclick = () => resolve(null);
  $("nextBtn").onclick = next;
  $("shareBtn").onclick = share;
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && S && !$("reveal").classList.contains("hidden") && document.activeElement !== $("nextBtn")) next();
  });

  const w = DATA.window;
  $("foot").textContent = `Rarity from English Wikipedia human pageviews, ${w[0]} to ${w[1]} · ${DATA.categories.reduce((n, c) => n + c.total, 0)} ranked answers · data built ${DATA.generated}`;
  home();
})();
