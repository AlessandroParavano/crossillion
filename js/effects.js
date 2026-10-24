/* effects.js - the two big visual moments: the holy glow when you touch the cross, and the Burning Bush fire. */
(function (CX) {
  "use strict";
  const { $, rnd } = CX;

  /* Touching a cross: it flares and a burst of golden light spreads from it. */
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
      sparks += `<i style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d - 60).toFixed(0)}px;--s:${rnd(2, 6).toFixed(1)}px;--t:${rnd(0.9, 1.8).toFixed(2)}s;animation-delay:${rnd(0, 0.3).toFixed(2)}s"></i>`;
    }
    h.innerHTML = `<b class="hl-flash"></b><b class="hl-rays"></b><b class="hl-halo"></b><b class="hl-ring"></b>${sparks}`;
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 2700);
    CX.sfx.play("holy");
  }

  /* Burning Bush: the cross catches fire, but is not consumed. */
  function burnCross() {
    const dv = $("diver");
    const visible = dv.getClientRects().length > 0;                 // the big cross is hidden on narrow screens
    let cx = innerWidth * 0.45, cy = innerHeight * 0.38;
    if (visible) { const r = dv.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
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
    CX.sfx.play("burn");
  }

  /* effect name from config.js (a tier's `effect`) -> the function that plays it */
  const byName = { burn: burnCross };

  CX.effects = { holyGlow, burnCross, byName };
})(window.CX = window.CX || {});
