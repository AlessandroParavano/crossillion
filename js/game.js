/* game.js - one game from start to finish: the question loop, the clock, answering, scoring.
   It draws onto the elements in index.html and asks js/screens.js to change screens. */
(function (CX) {
  "use strict";
  const { $, fmt, esc, store } = CX;
  const cfg = CX.config;
  const { match, suggest } = CX.matching;

  let S = null;                       // the game in progress: { mode, date, cats, i, height, results }
  let phase = "idle";                 // idle | preview (3-2-1) | live (clock running) | reveal (result card showing)
  let timer = null, previewTimer = null, revealAt = 0, sugg = null;

  const stopTimers = () => { cancelAnimationFrame(timer); clearInterval(previewTimer); };
  const feedback = (text, kind = "") => { const f = $("feedback"); f.className = "feedback " + kind; f.textContent = text; };
  const shake = () => { const i = $("answerInput"); i.classList.remove("shake"); void i.offsetWidth; i.classList.add("shake"); };

  /* ---------- starting and stopping ---------- */
  function start(mode) {
    const key = CX.todayKey();
    if (mode === "daily") {
      const done = store.get("daily." + key);
      if (done) return CX.screens.showEnd(done, true);                   // already played today: just show the result
    }
    S = { mode, date: key, cats: mode === "daily" ? CX.rotation.daily(key) : CX.rotation.random(), i: 0, height: 0, results: [] };
    $("mode").textContent = mode === "daily" ? "Daily · " + key : "Endless";
    CX.world.reset();
    CX.world.setDepth(0, { silent: true });
    CX.screens.show("screen-game");
    CX.sfx.play("start");
    nextQuestion();
  }

  function cancel() { stopTimers(); S = null; phase = "idle"; }

  /* ---------- one question ---------- */
  function nextQuestion() {
    const cat = S.cats[S.i];
    $("qCount").textContent = `${S.i + 1} / ${cfg.rounds}`;
    $("prompt").textContent = cat.prompt;
    $("reveal").classList.add("hidden");
    $("answerForm").classList.remove("hidden");
    const input = $("answerInput"); input.value = ""; input.disabled = true;
    stopTimers();
    $("timerBar").style.transform = "scaleX(1)"; $("timerBar").classList.remove("low");
    phase = "preview"; sugg = null;
    let n = cfg.previewSeconds;
    const say = () => { feedback(`Get ready… ${n}`, "hint"); CX.sfx.play("count", n); };
    say();
    previewTimer = setInterval(() => { n--; if (n > 0) return say(); clearInterval(previewTimer); go(); }, 1000);

    function go() {                                                       // the clock starts
      phase = "live";
      feedback("");
      input.disabled = false; input.focus();
      CX.sfx.play("go");
      const deadline = performance.now() + cfg.seconds * 1000;
      let lastSecond = 99;
      const tick = () => {
        const left = deadline - performance.now();
        $("timerBar").style.transform = `scaleX(${Math.max(left, 0) / (cfg.seconds * 1000)})`;
        $("timerBar").classList.toggle("low", left < 5000);
        const sec = Math.ceil(left / 1000);
        if (left < 5000 && left > 0 && sec !== lastSecond) { lastSecond = sec; CX.sfx.play("lowtime", sec); }
        if (left <= 0) return resolve(null);                              // out of time
        timer = requestAnimationFrame(tick);
      };
      tick();
    }
  }

  /* the answer is in (or time ran out): score it and show the result card */
  function resolve(entry, typed) {
    stopTimers(); phase = "reveal"; revealAt = performance.now();
    const cat = S.cats[S.i];
    const ti = entry ? CX.rules.tierIndex(entry.r, cat.total) : null;
    const tier = entry ? cfg.tiers[ti] : null;
    const gain = tier ? tier.meters : 0;
    S.height += gain;
    S.results.push({ cat: cat.id, prompt: cat.prompt, entry: entry ? entry.n : null, wiki: entry ? entry.w : null,
      views: entry ? entry.v : 0, rank: entry ? entry.r : 0, total: cat.total, tier: ti, gain, typed });
    CX.world.setDepth(S.height);

    $("answerForm").classList.add("hidden");
    feedback("");
    const badge = $("revBadge");
    badge.textContent = tier ? tier.name : "No answer";
    badge.className = "badge" + (tier && tier.effect === "burn" ? " fire" : "");
    badge.style.setProperty("--c", tier ? tier.color : "var(--ink-dim)");
    $("revGain").textContent = `+${fmt(gain)} m`;
    $("revAnswer").textContent = entry ? entry.n : "Time ran out";
    const rarest = cat.entries[cat.entries.length - 1];
    $("revFact").innerHTML = entry
      ? `Ranked <b>#${entry.r}</b> of ${cat.total} answers · looked up about <b>${fmt(entry.v)}</b> times on Wikipedia in the last year.`
      : `The rarest answer we know here is <b>${esc(rarest.n)}</b> (about ${fmt(rarest.v)} lookups a year).`;
    $("nextBtn").textContent = S.i === cfg.rounds - 1 ? "See result" : "Next";
    $("reveal").classList.remove("hidden");
    $("nextBtn").focus();

    if (tier) { CX.sfx.play("tier", ti); CX.sfx.play("descend", gain); } else CX.sfx.play("timeout");
    if (tier && tier.effect && CX.effects.byName[tier.effect]) setTimeout(CX.effects.byName[tier.effect], 250);
  }

  /* ---------- answering ---------- */
  function offer(entry, raw) {                                            // "Did you mean ...?  Press Enter to use it."
    sugg = { raw: raw.trim(), entry };
    const f = $("feedback");
    f.className = "feedback suggest";
    f.innerHTML = `Did you mean <button type="button" class="sugg" id="suggBtn">${esc(entry.n)}</button>? Press <kbd>Enter</kbd> to use it.`;
    $("suggBtn").onclick = () => { $("answerInput").focus(); if (phase === "live") resolve(entry, raw); };
    CX.sfx.play("suggest");
  }

  function reject(text) { sugg = null; shake(); feedback(text); CX.sfx.play("reject"); }

  function submit(e) {
    e.preventDefault();
    if (phase !== "live") return;
    const cat = S.cats[S.i];
    const raw = $("answerInput").value;
    if (!raw.trim()) return;
    const exact = match(cat, raw);
    if (exact) return resolve(exact, raw);
    if (sugg && sugg.raw === raw.trim()) return resolve(sugg.entry, raw);   // Enter again = accept the correction
    const all = window.CROSSILLION_DATA.categories;
    if (cat.src && cat.src.some(id => { const c = all.find(x => x.id === id); return c && match(c, raw); }))
      return reject("That's a real answer, but it doesn't fit this question's rule.");
    const near = suggest(cat, raw);
    if (near) return offer(near, raw);
    reject("Not in our records. Try another answer.");
  }

  $("answerInput").addEventListener("input", () => {                      // typing again clears a correction offer
    if (phase !== "live") return;
    sugg = null; feedback("");
  });

  /* ---------- moving on ---------- */
  function next() {
    if (phase !== "reveal" || performance.now() - revealAt < 450) return;   // ignore held / double Enter
    if (S.i === cfg.rounds - 1) {
      const out = { mode: S.mode, date: S.date, height: S.height, results: S.results };
      if (S.mode === "daily") store.set("daily." + S.date, out);
      const st = store.get("stats", { played: 0, best: 0, total: 0 });
      st.played++; st.total += S.height; st.best = Math.max(st.best, S.height);
      store.set("stats", st);
      return CX.screens.showEnd(out, false);
    }
    S.i++; nextQuestion();
  }

  CX.game = { start, cancel, submit, next, get active() { return !!S; }, get revealing() { return phase === "reveal"; } };
})(window.CX = window.CX || {});
