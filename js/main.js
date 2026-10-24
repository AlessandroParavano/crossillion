/* main.js - starts the game: fills in the parts of the page that come from config.js, and connects buttons to actions. */
(function (CX) {
  "use strict";
  const { $, esc } = CX;
  const cfg = CX.config;

  /* the tier chips on the home screen and the list in "How to play" come from config.js, so they never go out of date */
  function drawTiers() {
    const last = cfg.tiers.length - 1;
    $("tierChips").innerHTML = cfg.tiers.map((t, i) =>
      `<span class="chip${i === last ? " apex" : ""}" style="--c:${t.color}">${esc(t.name)}</span>`).join("");
    $("helpTiers").innerHTML = cfg.tiers.map(t =>
      `<li><span class="chip" style="--c:${t.color}">${esc(t.name)}</span> ${CX.fmt(t.meters)} m</li>`).join("");
    $("helpDepth").textContent = CX.fmt(cfg.maxDepth);
    const depths = cfg.zones.map(z => CX.fmt(z.at));
    $("helpZones").textContent = depths.slice(0, -1).join(", ") + " and " + depths[depths.length - 1];
    $("helpSeconds").textContent = cfg.seconds;
    $("helpPreview").textContent = cfg.previewSeconds;
    $("helpRounds").textContent = cfg.rounds;
  }

  function wire() {
    // home screen
    $("dailyBtn").onclick = () => CX.game.start("daily");
    $("endlessBtn").onclick = () => CX.game.start("endless");
    $("againBtn").onclick = () => CX.game.start("endless");
    $("homeBtn").onclick = CX.screens.home;
    $("helpBtn").onclick = () => $("help").showModal();
    // playing
    $("answerForm").onsubmit = CX.game.submit;
    $("nextBtn").onclick = CX.game.next;
    document.addEventListener("keydown", e => {                            // Enter also moves on from a result card
      if (e.key === "Enter" && !e.repeat && CX.game.revealing && document.activeElement !== $("nextBtn")) CX.game.next();
    });
    // results
    $("shareBtn").onclick = () => CX.share.share(CX.screens.lastResult);
    // the cross: glow (and, on the home screen, a verse)
    const touch = (el, withVerse) => { el.blur(); CX.effects.holyGlow(el); if (withVerse) setTimeout(CX.verses.open, 700); };
    $("heroCross").onclick = () => touch($("heroCross"), true);
    $("heroCross").onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); touch($("heroCross"), true); } };
    $("diver").onclick = () => touch($("diver"), false);                   // mid-game: glow only, the clock keeps running
    // zone preview tour
    $("previewBtn").onclick = CX.screens.previewStart;
    $("pvPrev").onclick = () => CX.screens.previewStep(CX.screens.previewIndex - 1);
    $("pvNext").onclick = () => CX.screens.previewStep(CX.screens.previewIndex + 1);
    $("pvClose").onclick = CX.screens.home;
  }

  drawTiers();
  CX.world.build();
  CX.verses.init();
  CX.audio.init();                  // sound: sets up the buttons; the audio itself starts on the first click or key press
  wire();
  CX.screens.home();
})(window.CX = window.CX || {});
