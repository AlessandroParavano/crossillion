/* verses.js - the verse card you get by touching the cross on the home screen. */
(function (CX) {
  "use strict";
  const { $ } = CX;
  const VERSES = window.CROSSILLION_VERSES || [];
  let current = -1;

  function show(i, label) {
    current = i;
    const v = VERSES[i];
    $("vLabel").textContent = label;
    $("vText").textContent = v.text;
    $("vRef").textContent = `${v.ref} (ESV)`;
  }

  function open() {
    if (!VERSES.length) return;
    const today = (CX.hashStr("verse-" + CX.todayKey()) >>> 0) % VERSES.length;    // the same random verse for everyone each day
    show(current < 0 ? today : current, current < 0 || current === today ? "Verse of the day" : "A verse for you");
    if (!$("verse").open) { $("verse").showModal(); CX.sfx.play("verse"); }
  }

  function another() {
    let n;
    do { n = Math.floor(Math.random() * VERSES.length); } while (VERSES.length > 1 && n === current);
    show(n, "A verse for you");
    CX.sfx.play("verse");
  }

  function init() {
    $("vAnother").onclick = another;
    $("vClose").onclick = () => $("verse").close();
    $("verse").addEventListener("click", e => { if (e.target === $("verse")) $("verse").close(); });
  }

  CX.verses = { init, open };
})(window.CX = window.CX || {});
