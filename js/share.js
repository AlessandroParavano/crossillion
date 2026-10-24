/* share.js - the picture of your result, and sharing/copying/saving it. */
(function (CX) {
  "use strict";
  const { $, fmt } = CX;

  /* draw the result card on a canvas */
  function picture(o) {
    const W = 1000, H = 620, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const zone = CX.rules.zoneAt(o.height);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, zone.sky[0]); bg.addColorStop(1, zone.sky[1]);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(8,8,24,.55)"; g.beginPath(); g.roundRect(60, 50, W - 120, H - 100, 28); g.fill();
    g.save(); g.translate(W / 2 - 40, 78); g.scale(2.5, 2.5);                       // the cross
    const cg = g.createLinearGradient(0, 0, 0, 32); cg.addColorStop(0, "#ffe9a8"); cg.addColorStop(.55, "#f2c14e"); cg.addColorStop(1, "#c8872a");
    g.fillStyle = cg; g.shadowColor = "rgba(242,193,78,.7)"; g.shadowBlur = 14;
    g.fill(new Path2D("M13 3h6v9h9v6h-9v11h-6V18H4v-6h9z")); g.restore();
    g.textAlign = "center"; g.shadowBlur = 0;
    g.fillStyle = "#f4efe2"; g.font = "700 54px Georgia, serif"; g.fillText("Crossillion", W / 2, 230);
    g.fillStyle = "#bdbacd"; g.font = "22px system-ui, sans-serif";
    g.fillText(o.mode === "daily" ? "Daily Descent · " + o.date : "Endless Descent", W / 2, 268);
    g.fillStyle = "#f2c14e"; g.font = "700 96px Georgia, serif"; g.fillText(fmt(o.height) + " m", W / 2, 370);
    g.fillStyle = "#f4efe2"; g.font = "italic 30px Georgia, serif"; g.fillText(zone.name, W / 2, 418);
    const n = o.results.length, s = 62, gap = 14, x0 = (W - (n * s + (n - 1) * gap)) / 2;
    o.results.forEach((r, i) => {                                                    // one square per question, in its tier's colour
      g.fillStyle = r.tier != null ? CX.config.tiers[r.tier].color : "rgba(255,255,255,.12)";
      g.beginPath(); g.roundRect(x0 + i * (s + gap), 460, s, s, 12); g.fill();
    });
    g.fillStyle = "#bdbacd"; g.font = "20px system-ui, sans-serif";
    g.fillText(location.host || "Crossillion", W / 2, 565);
    return c;
  }

  /* share it (phone), copy it (desktop), or save it as a last resort */
  async function share(o) {
    if (!o) return;
    const text = `Crossillion ${o.mode === "daily" ? o.date : "(Endless)"} - ${fmt(o.height)} m deep, ${CX.rules.zoneAt(o.height).name}\n${location.href.split("#")[0]}`;
    const msg = $("shareMsg");
    const blob = await new Promise(r => picture(o).toBlob(r, "image/png"));
    const file = blob && new File([blob], "crossillion.png", { type: "image/png" });
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      if (blob && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        msg.textContent = "Result image copied to clipboard."; return;
      }
    } catch (e) { if (e && e.name === "AbortError") return; }
    if (blob) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "crossillion.png"; a.click();
      msg.textContent = "Result image saved.";
    } else msg.textContent = text;
  }

  CX.share = { picture, share };
})(window.CX = window.CX || {});
