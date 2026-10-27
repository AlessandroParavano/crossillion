/* screens.js - the three screens (home, game, results) and the zone preview tour. */
(function (CX) {
  "use strict";
  const { $, fmt, esc, store } = CX;
  const cfg = CX.config;

  /* switch screens; the ruler, the answer dock and a few body classes follow */
  function show(id) {
    ["screen-start", "screen-game", "screen-end"].forEach(s => $(s).classList.toggle("hidden", s !== id));
    $("ruler").classList.toggle("hidden", id === "screen-start");
    $("dock").classList.toggle("hidden", id !== "screen-game");
    document.body.classList.toggle("ruler-on", id !== "screen-start");
    document.body.classList.toggle("playing", id === "screen-game");
    window.scrollTo(0, 0);
  }

  function home() {
    CX.game.cancel();
    show("screen-start");
    document.body.classList.remove("preview");
    $("previewBar").classList.add("hidden");
    CX.world.reset();
    CX.world.setDepth(0, { quiet: true });
    const done = store.get("daily." + CX.todayKey());
    $("dailyStatus").textContent = done ? `Today's Descent complete: ${fmt(done.height)} m deep.` : "A new Descent every day at midnight UTC.";
    $("dailyBtn").textContent = done ? "View Today's Result" : "Today's Descent";
    const st = store.get("stats", null);
    $("statsLine").textContent = st ? `Descents: ${st.played} · Best: ${fmt(st.best)} m · Average: ${fmt(Math.round(st.total / st.played))} m` : "";
  }

  let lastResult = null;
  function showEnd(out, replay) {
    CX.game.cancel();
    lastResult = out;
    show("screen-end");
    CX.world.reset();
    CX.world.setDepth(out.height, { quiet: true });
    $("endMode").textContent = out.mode === "daily" ? "Today's Descent · " + out.date : "Endless Mode";
    $("endHeight").textContent = fmt(out.height);
    $("endZone").textContent = "You descended to " + CX.rules.zoneAt(out.height).name;
    const colour = r => (typeof r.tier === "number" && cfg.tiers[r.tier]) ? cfg.tiers[r.tier].color : null;
    $("endGrid").innerHTML = out.results.map(r => `<i class="sq ${colour(r) ? "" : "none"}" style="--c:${colour(r) || "transparent"}"></i>`).join("");
    const cats = window.CROSSILLION_DATA.categories;
    $("endList").innerHTML = out.results.map(r => {
      const tier = typeof r.tier === "number" ? cfg.tiers[r.tier] : null;
      return `<li><span class="q">${esc(r.prompt)}</span>
        <span class="a">${r.entry ? esc(r.entry) : "—"}</span>
        <span class="p" style="--c:${tier ? tier.color : "var(--ink-dim)"}">${tier ? esc(tier.name) + " · +" + fmt(r.gain) + " m" : "No answer"}</span>
        <span class="d">${r.entry ? `#${r.rank} of ${r.total} · ~${fmt(r.views)} yearly lookups` : ""}</span></li>`;
    }).join("");
    $("shareMsg").textContent = replay ? "You've already descended today — come back tomorrow, or try Endless Mode." : "";
    CX.sfx.play("end", out.height);
  }

  /* ---------- "Preview the zones" tour ---------- */
  let pv = 0;
  function previewStep(i) {
    pv = (i + cfg.zones.length) % cfg.zones.length;
    $("pvNum").textContent = `Zone ${pv + 1} of ${cfg.zones.length}`;
    $("pvName").textContent = cfg.zones[pv].name;
    CX.world.setDepth(cfg.zones[pv].view);
  }
  function previewStart() {
    $("screen-start").classList.add("hidden");
    $("ruler").classList.remove("hidden");
    $("previewBar").classList.remove("hidden");
    document.body.classList.add("preview", "ruler-on");
    CX.world.reset();
    previewStep(0);
  }

  CX.screens = { show, home, showEnd, previewStart, previewStep, get previewIndex() { return pv; }, get lastResult() { return lastResult; } };
})(window.CX = window.CX || {});
