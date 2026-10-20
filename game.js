(() => {
  "use strict";
  const DATA = window.CROSSILLION_DATA;
  const ROUNDS = 7, SECONDS = 25, PREVIEW = 3;

  // Same six tiers and values as Krillion (points x 10 = meters)
  const TIERS = {
    plankton:    { name: "Flock",           pts: 100,  cls: "t-plankton" },
    clever:      { name: "Pharisee",        pts: 150,  cls: "t-clever" },
    schooler:    { name: "Sunday Schooler", pts: 300,  cls: "t-schooler" },
    rare:        { name: "Seminarian",      pts: 600,  cls: "t-rare" },
    deepcut:     { name: "Theologian",      pts: 850,  cls: "t-deepcut" },
    crossillion: { name: "Burning Bush",    pts: 1000, cls: "t-crossillion" },
  };
  const zoneOf = h => CXWorld.zones[CXWorld.zoneIndex(h)].name;

  const $ = id => document.getElementById(id);
  const show = id => {
    ["screen-start", "screen-game", "screen-end"].forEach(s => $(s).classList.toggle("hidden", s !== id));
    $("ruler").classList.toggle("hidden", id === "screen-start");
    $("dock").classList.toggle("hidden", id !== "screen-game");
    document.body.classList.toggle("ruler-on", id !== "screen-start");
    document.body.classList.toggle("playing", id === "screen-game");
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
  // exact match only (aliases and honorifics like "saint" / "pope" / "the" are forgiven)
  function match(cat, raw) {
    const q = strip(raw);
    if (q.length < 2) return null;
    const map = indexFor(cat);
    for (const v of variants(q)) if (map.has(v)) return map.get(v);
    return null;
  }
  // close-but-not-exact: returns the single best candidate to offer as a correction
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
        else if (v.length >= 4 && k.startsWith(v)) consider(e, 1.5);   // typed only the start of it
      }
    }
    return tie ? null : best;
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
    CXWorld.reset();
    setAlt(0);
    show("screen-game");
    nextQ();
  }

  const setAlt = (h, opts) => CXWorld.setDepth(h, opts);

  let phase = "idle", previewTimer = null, revealAt = 0, sugg = null;
  function nextQ() {
    const cat = S.cats[S.i];
    $("qCount").textContent = `${S.i + 1} / ${ROUNDS}`;
    $("prompt").textContent = cat.prompt;
    $("reveal").classList.add("hidden");
    $("answerForm").classList.remove("hidden");
    const inp = $("answerInput"); inp.value = ""; inp.disabled = true;
    cancelAnimationFrame(timer); clearInterval(previewTimer);
    $("timerBar").style.transform = "scaleX(1)"; $("timerBar").classList.remove("low");
    // 3-second preview, then the 25-second clock starts (as in Krillion)
    phase = "preview";
    let n = PREVIEW;
    sugg = null;
    const say = () => { const f = $("feedback"); f.className = "feedback hint"; f.textContent = `Get ready… ${n}`; };
    say();
    previewTimer = setInterval(() => { n--; if (n > 0) return say(); clearInterval(previewTimer); go(); }, 1000);
    function go() {
      phase = "live";
      $("feedback").className = "feedback"; $("feedback").textContent = "";
      inp.disabled = false; inp.focus();
      deadline = performance.now() + SECONDS * 1000;
      const tick = () => {
        const left = deadline - performance.now();
        $("timerBar").style.transform = `scaleX(${Math.max(left, 0) / (SECONDS * 1000)})`;
        $("timerBar").classList.toggle("low", left < 5000);
        if (left <= 0) return resolve(null);
        timer = requestAnimationFrame(tick);
      };
      tick();
    }
  }

  function resolve(entry, typed) {
    cancelAnimationFrame(timer); clearInterval(previewTimer); phase = "reveal"; revealAt = performance.now();
    const cat = S.cats[S.i];
    const t = entry ? TIERS[entry.t] : null;
    const gain = t ? t.pts : 0;
    S.height += gain;
    S.results.push({ cat: cat.id, prompt: cat.prompt, entry: entry ? entry.n : null, wiki: entry ? entry.w : null,
      views: entry ? entry.v : 0, rank: entry ? entry.r : 0, total: cat.total, tier: entry ? entry.t : null, gain, typed });
    setAlt(S.height);
    $("answerForm").classList.add("hidden");
    $("feedback").className = "feedback"; $("feedback").textContent = "";
    const badge = $("revBadge");
    badge.textContent = t ? t.name : "No answer";
    badge.className = "badge " + (t ? t.cls : "") + (entry && entry.t === "crossillion" ? " fire" : "");
    $("revGain").textContent = t ? `+${fmt(gain)} m` : "+0 m";
    $("revAnswer").textContent = entry ? entry.n : "Time ran out";
    const rarest = cat.entries[cat.entries.length - 1];
    $("revFact").innerHTML = entry
      ? `Ranked <b>#${entry.r}</b> of ${cat.total} answers · looked up about <b>${fmt(entry.v)}</b> times on Wikipedia in the last year.`
      : `The rarest answer we know here is <b>${rarest.n}</b> (about ${fmt(rarest.v)} lookups a year).`;
    $("nextBtn").textContent = S.i === ROUNDS - 1 ? "See result" : "Next";
    $("reveal").classList.remove("hidden");
    $("nextBtn").focus();
    if (entry && entry.t === "crossillion") setTimeout(burnCross, 250);
  }

  function offer(entry, raw) {
    sugg = { raw: raw.trim(), entry };
    const f = $("feedback");
    f.className = "feedback suggest";
    f.innerHTML = `Did you mean <button type="button" class="sugg" id="suggBtn">${esc(entry.n)}</button>? Press <kbd>Enter</kbd> to use it.`;
    $("suggBtn").onclick = () => { $("answerInput").focus(); if (phase === "live") resolve(entry, raw); };
  }

  function submit(e) {
    e.preventDefault();
    if (phase !== "live") return;
    const cat = S.cats[S.i];
    const raw = $("answerInput").value;
    if (!raw.trim()) return;
    const exact = match(cat, raw);
    if (exact) return resolve(exact, raw);
    if (sugg && sugg.raw === raw.trim()) return resolve(sugg.entry, raw);   // Enter again = accept the correction
    const near = suggest(cat, raw);
    if (near) return offer(near, raw);
    const inp = $("answerInput");
    inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake");
    sugg = null;
    $("feedback").className = "feedback"; $("feedback").textContent = "Not in our records. Try another answer.";
  }

  function next() {
    if (phase !== "reveal" || performance.now() - revealAt < 450) return;   // ignore held / double Enter
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
    S = null; cancelAnimationFrame(timer); clearInterval(previewTimer); phase = "idle";
    show("screen-end");
    CXWorld.reset();
    setAlt(out.height, { quiet: true });
    $("endMode").textContent = out.mode === "daily" ? "Today's Descent · " + out.date : "Endless Mode";
    $("endHeight").textContent = fmt(out.height);
    $("endZone").textContent = "You descended to " + zoneOf(out.height);
    $("endGrid").innerHTML = out.results.map(r => `<i class="sq ${r.tier ? TIERS[r.tier].cls : "none"}"></i>`).join("");
    $("endList").innerHTML = out.results.map(r => {
      const t = r.tier ? TIERS[r.tier] : null;
      const cat = DATA.categories.find(c => c.id === r.cat);
      const rarest = cat ? cat.entries[cat.entries.length - 1] : null;
      return `<li><span class="q">${esc(r.prompt)}</span>
        <span class="a">${r.entry ? esc(r.entry) : "—"}</span>
        <span class="p ${t ? t.cls : ""}">${t ? t.name + " · +" + fmt(r.gain) + " m" : "No answer"}</span>
        <span class="d">${r.entry ? `#${r.rank} of ${r.total} · ~${fmt(r.views)} yearly lookups` : ""}${rarest ? ` · Deepest: ${esc(rarest.n)}` : ""}</span></li>`;
    }).join("");
    $("againBtn").style.display = "";
    $("shareMsg").textContent = replay ? "You've already descended today — come back tomorrow, or try Endless Mode." : "";
    out._cur = out; window._cx = out;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const TIER_COL = { plankton: "#8b93a7", clever: "#7fb3d5", schooler: "#5fd0b8", rare: "#f0b24a", deepcut: "#ff7a55", crossillion: "#d09bff" };
  function shareCanvas(o) {
    const W = 1000, H = 620, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const zi = CXWorld.zoneIndex(o.height);
    const SK = [["#3f9ae6", "#bfe3f7"], ["#5b4331", "#2a1c14"], ["#262a47", "#10111f"], ["#2f2013", "#120a06"], ["#f2c14e", "#fff4c9"]][zi];
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, SK[0]); bg.addColorStop(1, SK[1]);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const dark = zi !== 0 && zi !== 4;
    g.fillStyle = "rgba(8,8,24,.55)"; g.beginPath(); g.roundRect(60, 50, W - 120, H - 100, 28); g.fill();
    // cross
    g.save(); g.translate(W / 2 - 40, 78); g.scale(2.5, 2.5);
    const cg = g.createLinearGradient(0, 0, 0, 32); cg.addColorStop(0, "#ffe9a8"); cg.addColorStop(.55, "#f2c14e"); cg.addColorStop(1, "#c8872a");
    g.fillStyle = cg; g.shadowColor = "rgba(242,193,78,.7)"; g.shadowBlur = 14;
    g.fill(new Path2D("M13 3h6v9h9v6h-9v11h-6V18H4v-6h9z")); g.restore();
    g.textAlign = "center"; g.shadowBlur = 0;
    g.fillStyle = "#f4efe2"; g.font = "700 54px Georgia, serif"; g.fillText("Crossillion", W / 2, 230);
    g.fillStyle = "#bdbacd"; g.font = "22px system-ui, sans-serif";
    g.fillText(o.mode === "daily" ? "Daily Descent · " + o.date : "Endless Descent", W / 2, 268);
    g.fillStyle = "#f2c14e"; g.font = "700 96px Georgia, serif"; g.fillText(fmt(o.height) + " m", W / 2, 370);
    g.fillStyle = "#f4efe2"; g.font = "italic 30px Georgia, serif"; g.fillText(zoneOf(o.height), W / 2, 418);
    const n = o.results.length, s = 62, gap = 14, x0 = (W - (n * s + (n - 1) * gap)) / 2;
    o.results.forEach((r, i) => {
      g.fillStyle = r.tier ? TIER_COL[r.tier] : "rgba(255,255,255,.12)";
      g.beginPath(); g.roundRect(x0 + i * (s + gap), 460, s, s, 12); g.fill();
    });
    g.fillStyle = "#bdbacd"; g.font = "20px system-ui, sans-serif";
    g.fillText(location.host || "Crossillion", W / 2, 565);
    return c;
  }

  async function share() {
    const o = window._cx; if (!o) return;
    const text = `Crossillion ${o.mode === "daily" ? o.date : "(Endless)"} - ${fmt(o.height)} m deep, ${zoneOf(o.height)}\n${location.href.split("#")[0]}`;
    const msg = $("shareMsg");
    const blob = await new Promise(r => shareCanvas(o).toBlob(r, "image/png"));
    const file = blob && new File([blob], "crossillion.png", { type: "image/png" });
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      if (blob && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); msg.textContent = "Result image copied to clipboard."; return;
      }
    } catch (e) { if (e && e.name === "AbortError") return; }
    if (blob) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "crossillion.png"; a.click();
      msg.textContent = "Result image saved.";
    } else msg.textContent = text;
  }

  /* ---------- start screen ---------- */
  function home() {
    S = null; cancelAnimationFrame(timer); clearInterval(previewTimer); phase = "idle";
    show("screen-start");
    document.body.classList.remove("preview");
    $("previewBar").classList.add("hidden");
    CXWorld.reset();
    setAlt(0, { quiet: true });
    const done = store.get("cx.daily." + todayKey());
    $("dailyStatus").textContent = done ? `Today's Descent complete: ${fmt(done.height)} m deep.` : "A new Descent every day at midnight UTC.";
    $("dailyBtn").textContent = done ? "View Today's Result" : "Today's Descent";
    const st = store.get("cx.stats", null);
    $("statsLine").textContent = st ? `Descents: ${st.played} · Best: ${fmt(st.best)} m · Average: ${fmt(Math.round(st.total / st.played))} m` : "";
  }

  /* ---------- touch the cross: holy glow + verse ---------- */
  function holyGlow(el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    el.classList.remove("blessed"); void el.getBoundingClientRect(); el.classList.add("blessed");
    setTimeout(() => el.classList.remove("blessed"), 1900);
    const h = document.createElement("div");
    h.className = "holy"; h.style.setProperty("--x", cx + "px"); h.style.setProperty("--y", cy + "px");
    let sparks = "";
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 200;
      sparks += `<i style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - 60).toFixed(0)}px;--s:${(2 + Math.random() * 4).toFixed(1)}px;--t:${(0.9 + Math.random() * 0.9).toFixed(2)}s;animation-delay:${(Math.random() * 0.3).toFixed(2)}s"></i>`;
    }
    h.innerHTML = `<b class="hl-flash"></b><b class="hl-rays"></b><b class="hl-halo"></b><b class="hl-ring"></b>${sparks}`;
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 2700);
  }

  // Burning Bush: the cross catches fire, but is not consumed
  function burnCross() {
    const dv = $("diver");
    const visible = dv.getClientRects().length > 0;          // the big cross is hidden on narrow screens
    let cx = innerWidth * 0.45, cy = innerHeight * 0.38;
    if (visible) { const r = dv.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    const rnd = (a, b) => a + Math.random() * (b - a);
    const o = document.createElement("div");
    o.className = "burn"; o.style.setProperty("--x", cx + "px"); o.style.setProperty("--y", cy + "px");
    let html = `<b class="bn-flash"></b><b class="bn-glow"></b>` + (visible ? "" : `<svg class="bn-cross" viewBox="0 0 32 32"><use href="#crossShape"/></svg>`);
    for (let i = 0; i < 20; i++)
      html += `<i class="fl" style="--fx:${rnd(-34, 34).toFixed(0)}px;--fy:${rnd(-48, 40).toFixed(0)}px;--fs:${rnd(22, 46).toFixed(0)}px;--ft:${rnd(0.7, 1.3).toFixed(2)}s;animation-delay:${rnd(0.1, 1.2).toFixed(2)}s"></i>`;
    for (let i = 0; i < 34; i++)
      html += `<i class="em" style="--ex:${rnd(-40, 40).toFixed(0)}px;--ey:${rnd(-30, 30).toFixed(0)}px;--dx:${rnd(-50, 50).toFixed(0)}px;--es:${rnd(2, 5).toFixed(1)}px;--et:${rnd(1.3, 2.6).toFixed(2)}s;animation-delay:${rnd(0, 1.8).toFixed(2)}s"></i>`;
    o.innerHTML = html;
    document.body.appendChild(o);
    if (visible) { dv.classList.remove("burning"); void dv.getBoundingClientRect(); dv.classList.add("burning"); setTimeout(() => dv.classList.remove("burning"), 3500); }
    setTimeout(() => o.remove(), 3900);
  }

  const VERSES = window.CROSSILLION_VERSES || [];
  let vIdx = -1;
  function showVerse(i, label) {
    vIdx = i;
    const v = VERSES[i];
    $("vLabel").textContent = label;
    $("vText").textContent = v.text;
    $("vRef").textContent = `${v.ref} (ESV)`;
  }
  function openVerse() {
    if (!VERSES.length) return;
    const today = (hashStr("verse-" + todayKey()) >>> 0) % VERSES.length;   // same random verse for everyone each day
    showVerse(vIdx < 0 ? today : vIdx, vIdx < 0 || vIdx === today ? "Verse of the day" : "A verse for you");
    if (!$("verse").open) $("verse").showModal();
  }
  function touchCross(el, withVerse) {
    el.blur();                                  // no focus box after a click
    holyGlow(el);
    if (withVerse) setTimeout(openVerse, 700);
  }
  $("heroCross").onclick = () => touchCross($("heroCross"), true);
  $("heroCross").onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); touchCross($("heroCross"), true); } };
  $("diver").onclick = () => touchCross($("diver"), false);       // mid-game: glow only, the clock keeps running
  $("vAnother").onclick = () => {
    let n; do { n = Math.floor(Math.random() * VERSES.length); } while (VERSES.length > 1 && n === vIdx);
    showVerse(n, "A verse for you");
  };
  $("vClose").onclick = () => $("verse").close();
  $("verse").addEventListener("click", e => { if (e.target === $("verse")) $("verse").close(); });

  /* zone preview */
  const PV = [0, 560, 1250, 4500, 7000];
  let pv = 0;
  function preview(i) {
    pv = (i + PV.length) % PV.length;
    const z = CXWorld.zones[pv];
    $("pvNum").textContent = `Zone ${pv + 1} of ${PV.length}`;
    $("pvName").textContent = z.name;
    CXWorld.setDepth(PV[pv]);
  }
  $("previewBtn").onclick = () => {
    $("screen-start").classList.add("hidden");
    $("ruler").classList.remove("hidden");
    $("previewBar").classList.remove("hidden");
    document.body.classList.add("preview", "ruler-on");
    CXWorld.reset(); preview(0);
  };
  $("pvPrev").onclick = () => preview(pv - 1);
  $("pvNext").onclick = () => preview(pv + 1);
  $("pvClose").onclick = () => home();

  $("dailyBtn").onclick = () => start("daily");
  $("endlessBtn").onclick = () => start("endless");
  $("againBtn").onclick = () => start("endless");
  $("homeBtn").onclick = home;
  $("helpBtn").onclick = () => $("help").showModal();
  $("answerForm").onsubmit = submit;
  $("answerInput").addEventListener("input", () => {
    if (phase !== "live") return;
    sugg = null; $("feedback").className = "feedback"; $("feedback").textContent = "";
  });
    $("nextBtn").onclick = next;
  $("shareBtn").onclick = share;
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.repeat && S && !$("reveal").classList.contains("hidden") && document.activeElement !== $("nextBtn")) next();
  });

  CXWorld.build();
  home();
})();
