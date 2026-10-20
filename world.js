/* The descending world: five scenes stacked top to bottom, each more sacred than the last. */
window.CXWorld = (() => {
  "use strict";
  const K = 1;                          // pixels per meter (world AND ruler use the same scale)
  const KR = K;                         // ruler is 1:1 with the world
  const MAXD = 7000;
  // Zone boundaries match Krillion's: 0-200, 200-1,000, 1,000-4,000, 4,000-6,000, 6,000+ meters
  const ZONES = [
    { at: 0,    name: "The Sunday Street",   sub: "Where everyone starts" },
    { at: 200,  name: "The Nave",            sub: "Pews, candles and stained glass" },
    { at: 1000, name: "The Crypt",           sub: "Beneath the altar, the saints sleep" },
    { at: 4000, name: "The Catacombs",       sub: "Where the first Christians hid and prayed" },
    { at: 6000, name: "The Holy of Holies",  sub: "Deep calls to deep" },
  ];
  const zoneIndex = d => ZONES.reduce((n, z, i) => (d >= z.at ? i : n), 0);
  const $ = id => document.getElementById(id);

  const cross = (cls = "") => `<svg class="cross ${cls}" viewBox="0 0 32 32"><use href="#crossShape"/></svg>`;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function zoneSky() {
    const clouds = Array.from({ length: 5 }, (_, i) =>
      `<i class="cloud" style="top:${-330 + i * 60 + rnd(-15, 15)}px;left:${rnd(-10, 80)}%;--s:${rnd(.7, 1.4).toFixed(2)};--t:${rnd(70, 140).toFixed(0)}s;animation-delay:${-rnd(0, 100).toFixed(0)}s"></i>`).join("");
    const town = `
      <svg class="town" viewBox="0 -100 800 400" preserveAspectRatio="xMidYMax slice">
        <g fill="#2b3350">
          <rect x="20" y="180" width="90" height="120"/><polygon points="20,180 65,140 110,180"/>
          <rect x="130" y="210" width="70" height="90"/><polygon points="130,210 165,180 200,210"/>
          <rect x="560" y="190" width="100" height="110"/><polygon points="560,190 610,148 660,190"/>
          <rect x="690" y="215" width="90" height="85"/><polygon points="690,215 735,182 780,215"/>
        </g>
        <g fill="#1d233d">
          <rect x="300" y="170" width="200" height="130"/><polygon points="290,170 400,100 510,170"/>
          <rect x="380" y="20" width="40" height="110"/><polygon points="372,30 400,-30 428,30"/>
        </g>
        <path d="M400 -30v-52M385 -66h30" stroke="#f2c14e" stroke-width="6" stroke-linecap="round" fill="none"/>
        <g fill="#ffd77a" opacity=".9"><rect x="340" y="215" width="16" height="26" rx="8"/><rect x="444" y="215" width="16" height="26" rx="8"/><rect x="392" y="190" width="16" height="36" rx="8"/></g>
        <g fill="#ffd77a" opacity=".65"><rect x="45" y="225" width="12" height="18"/><rect x="590" y="225" width="12" height="18"/><rect x="715" y="245" width="12" height="16"/></g>
      </svg>`;
    return `<div class="sun"></div>${clouds}${town}<div class="grass"></div>`;
  }

  function zoneNave() {
    const win = (c1, c2, c3) => `
      <svg class="window" viewBox="0 0 60 120">
        <path d="M4 118V44A26 26 0 0 1 56 44V118Z" fill="#1a1020" stroke="#c9a15a" stroke-width="3"/>
        <path d="M10 112V46A20 20 0 0 1 50 46V112Z" fill="${c1}" opacity=".9"/>
        <path d="M10 46A20 20 0 0 1 30 26V112H10Z" fill="${c2}" opacity=".85"/>
        <path d="M30 70H50V112H30Z" fill="${c3}" opacity=".85"/>
        <path d="M30 26V112M10 70H50" stroke="#1a1020" stroke-width="2.5"/>
        <circle cx="30" cy="46" r="7" fill="#fff6c8" opacity=".85"/>
      </svg>`;
    const wins = [["#d94f5c", "#3b6fd4", "#e8b93c"], ["#3b6fd4", "#e8b93c", "#d94f5c"], ["#e8b93c", "#d94f5c", "#3b6fd4"],
                  ["#3b6fd4", "#d94f5c", "#e8b93c"], ["#d94f5c", "#e8b93c", "#3b6fd4"]].map(w => win(...w)).join("");
    const candles = Array.from({ length: 9 }, (_, i) =>
      `<i class="candle" style="left:${6 + i * 11}%;bottom:${70 + (i % 3) * 18}px;animation-delay:${-rnd(0, 2).toFixed(2)}s"></i>`).join("");
    return `<div class="wall"></div><div class="windows">${wins}</div>
      <div class="bigcross">${cross()}</div>${candles}
      <svg class="pews" viewBox="0 0 800 140" preserveAspectRatio="none">
        <g fill="#1f130d">${[0, 1, 2].map(r => `<rect x="0" y="${r * 42 + 10}" width="800" height="22"/>`).join("")}
        ${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 100 + 20}" y="0" width="12" height="140"/>`).join("")}</g>
        <g fill="#3a2418">${[0, 1, 2].map(r => `<rect x="0" y="${r * 42 + 6}" width="800" height="6"/>`).join("")}</g>
      </svg>`;
  }

  function zoneCrypt() {
    const arch = `<svg class="arches" viewBox="0 0 800 260" preserveAspectRatio="none">
      <g fill="#14152a">
        ${Array.from({ length: 5 }, (_, i) => {
          const x = i * 160;
          return `<path d="M${x} 260V90Q${x + 80} -20 ${x + 160} 90V260H${x + 142}V100Q${x + 80} 10 ${x + 18} 100V260Z"/>`;
        }).join("")}
      </g>
      <g fill="#33375a" opacity=".6">${Array.from({ length: 6 }, (_, i) => `<rect x="${i * 160 - 8}" y="90" width="16" height="170"/>`).join("")}</g>
    </svg>`;
    const tomb = `<svg class="tombs" viewBox="0 0 800 120" preserveAspectRatio="xMidYMax slice">
      <g fill="#262a47" stroke="#4a4f7c" stroke-width="2">
        <rect x="40" y="50" width="200" height="70" rx="6"/><rect x="300" y="38" width="200" height="82" rx="6"/><rect x="560" y="50" width="200" height="70" rx="6"/></g>
      <g stroke="#8a93b8" stroke-width="5" stroke-linecap="round" fill="none">
        <path d="M140 62v38M126 74h28"/><path d="M400 52v50M384 68h32"/><path d="M660 62v38M646 74h28"/></g></svg>`;
    // the crypt is 3,000 m tall: stack five vaults, each with arches, lamps and tombs
    let out = `<div class="bricks"></div>`;
    for (let r = 0; r < 5; r++) {
      const y = 40 + r * 600;
      out += arch.replace('class="arches"', `class="arches" style="top:${y}px"`);
      out += [18, 50, 82].map((l, i) =>
        `<div class="lamp" style="top:${y}px;left:${l}%;--h:${60 + ((i + r) % 3) * 25}px"><span></span><i></i></div>`).join("");
      out += tomb.replace('class="tombs"', `class="tombs" style="top:${y + 440}px;bottom:auto"`);
    }
    return out;
  }

  function zoneCatacombs() {
    const niches = () => Array.from({ length: 135 }, (_, i) =>
      `<i class="niche ${i % 7 === 3 ? "lit" : ""}"></i>`).join("");
    const G = {
      fish:   `<svg viewBox="0 0 64 32"><path d="M4 16Q24-2 46 16Q24 34 4 16ZM46 16L61 5M46 16L61 27"/></svg>`,
      chirho: `<svg viewBox="0 0 40 48"><path d="M20 4V46M20 4h5a8 8 0 0 1 0 16h-5M7 14L33 42M33 14L7 42"/></svg>`,
      anchor: `<svg viewBox="0 0 40 48"><circle cx="20" cy="7" r="4"/><path d="M20 11V44M12 18h16M5 30Q9 46 20 44Q31 46 35 30M5 30l-1 8M35 30l1 8"/></svg>`,
    };
    const glyphs = ["ΙΧΘΥΣ", G.chirho, G.anchor, G.fish];
    let out = `<div class="rock"></div><div class="loculi left">${niches()}</div><div class="loculi right">${niches()}</div>`;
    for (let i = 0; i < 6; i++) {            // carvings every ~330 m, alternating sides
      const left = i % 2 ? 76 : 8;
      out += `<span class="carve" style="left:${left}%;top:${130 + i * 330}px">${glyphs[i % 4]}</span>`;
    }
    for (let i = 0; i < 7; i++)              // torches every ~280 m
      out += `<div class="torch" style="left:${i % 2 ? 68 : 27}%;top:${90 + i * 285}px"><i></i></div>`;
    return out;
  }

  function zoneHoly() {
    const ark = `<svg class="ark" viewBox="0 0 320 220">
      <defs><linearGradient id="arkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset="1" stop-color="#d6962a"/></linearGradient></defs>
      <g fill="url(#arkg)" stroke="#8a5a14" stroke-width="2">
        <rect x="90" y="120" width="140" height="80" rx="6"/>
        <rect x="84" y="108" width="152" height="16" rx="5"/>
        <path d="M160 108C120 80 60 40 20 60C40 70 70 70 96 100Z"/>
        <path d="M160 108C200 80 260 40 300 60C280 70 250 70 224 100Z"/>
        <path d="M110 108C100 70 120 34 140 24C150 50 140 80 130 108Z"/>
        <path d="M210 108C220 70 200 34 180 24C170 50 180 80 190 108Z"/>
      </g>
      <g fill="#8a5a14"><circle cx="124" cy="22" r="9"/><circle cx="196" cy="22" r="9"/></g>
      <rect x="82" y="135" width="-0" height="0"/>
    </svg>`;
    return `<div class="glory"></div><div class="rays"></div>${ark}<div class="floorlight"></div>`;
  }

  function build() {
    const html = [zoneSky(), zoneNave(), zoneCrypt(), zoneCatacombs(), zoneHoly()]
      .map((h, i) => {
        const last = i === ZONES.length - 1;
        const height = last ? `calc(${(MAXD - ZONES[i].at) * K}px + 100vh)` : `${(ZONES[i + 1].at - ZONES[i].at) * K}px`;
        return `<section class="zone z${i}" style="top:${ZONES[i].at * K}px;height:${height}${i === 0 ? ";overflow:visible" : ""}">${h}</section>`;
      }).join("");
    $("world").innerHTML = html;
    // ruler (Krillion style): short tick every 25 m, medium every 50 m, long + label every 100 m
    let t = "";
    for (let d = 0; d <= MAXD; d += 25) {
      const cls = d % 100 === 0 ? "major" : d % 50 === 0 ? "mid" : "";
      t += `<div class="tick ${cls}" style="top:${d * KR}px"></div>`;
      if (d % 100 === 0) t += `<span class="lab" style="top:${d * KR}px">${d ? "-" + d.toLocaleString("en-US") + "m" : "0m"}</span>`;
    }
    ZONES.slice(1).forEach(z => { t += `<div class="rz" style="top:${z.at * KR}px"></div>`; });
    $("scale").innerHTML = t;
    $("scale").style.height = MAXD * KR + "px";
    // dotted line across the whole scene at each zone transition
    $("world").insertAdjacentHTML("beforeend", ZONES.slice(1).map(z => `<div class="zline" style="top:${z.at * K}px"></div>`).join(""));
    $("world").insertAdjacentHTML("afterbegin", `<div class="skycap"></div>`);
    const motes = Array.from({ length: 26 }, () =>
      `<i style="left:${rnd(0, 100).toFixed(1)}%;--d:${rnd(9, 22).toFixed(1)}s;--x:${rnd(-30, 30).toFixed(0)}px;--z:${rnd(2, 5).toFixed(1)}px;animation-delay:${-rnd(0, 20).toFixed(1)}s"></i>`).join("");
    $("motes").innerHTML = motes;
  }

  let lastZone = -1;
  function setDepth(d, opts = {}) {
    const root = document.documentElement;
    root.style.setProperty("--cam", `${-d * K}px`);
    root.style.setProperty("--ruler", `${-d * KR}px`);
    const zi = zoneIndex(d);
    root.dataset.zone = zi;
    $("depthNum").textContent = d.toLocaleString("en-US") + " m";
    if (zi !== lastZone) {
      lastZone = zi;
      const b = $("zoneBanner");
      $("zbNum").textContent = `Zone ${zi + 1} of ${ZONES.length}`;
      $("zbName").textContent = ZONES[zi].name;
      $("zbSub").textContent = ZONES[zi].sub;
      b.classList.remove("on"); void b.offsetWidth;
      if (!opts.quiet) b.classList.add("on");
    }
  }
  const reset = () => { lastZone = -1; };

  return { build, setDepth, zoneIndex, zones: ZONES, reset, MAXD };
})();
