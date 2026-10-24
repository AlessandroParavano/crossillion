/* config.js - every setting you are likely to want to change, in one place.
   (Questions and answers live in content/; this file is only about how the game plays and looks.) */
(function (CX) {
  "use strict";

  CX.config = {
    rounds: 7,              // questions per game
    seconds: 25,            // time to answer each question
    previewSeconds: 3,      // the "Get ready" countdown before the clock starts
    maxDepth: 7000,         // a perfect game: 7 x 1000 m
    storagePrefix: "cx.",   // localStorage keys (saved daily result and stats)

    /* The six rarity tiers, most common answer first.
         meters  how deep a correct answer of this tier takes you
         cutoff  the share of a question's answers (ranked by popularity) that count as this tier or a more common one
         color   the tier's colour in chips, labels and the share picture
         effect  optional: "burn" plays the Burning Bush fire on this tier
       Rename a tier here and it changes everywhere (home screen, help, results, share picture). */
    tiers: [
      { name: "Flock",           meters: 100,  cutoff: 0.10, color: "#8b93a7" },
      { name: "Pharisee",        meters: 150,  cutoff: 0.30, color: "#7fb3d5" },
      { name: "Sunday Schooler", meters: 300,  cutoff: 0.55, color: "#5fd0b8" },
      { name: "Seminarian",      meters: 600,  cutoff: 0.80, color: "#f0b24a" },
      { name: "Theologian",      meters: 850,  cutoff: 0.93, color: "#ff7a55" },
      { name: "Burning Bush",    meters: 1000, cutoff: 1.00, color: "#d09bff", effect: "burn" },
    ],

    /* The depth zones, shallowest first (Krillion's boundaries: 0 / 200 / 1,000 / 4,000 / 6,000 m).
         at       the depth in meters where the zone begins
         scene    which drawing in js/world.js to use
         view     the depth the "Preview the zones" tour jumps to
         sky      two colours used for the zone in the share picture
         music    which theme in js/audio/music.js plays here (same number as the zone by default) */
    zones: [
      { name: "The Sunday Street",  at: 0,    scene: "street",     view: 0,    sky: ["#3f9ae6", "#bfe3f7"], sub: "Where everyone starts" },
      { name: "The Nave",           at: 200,  scene: "nave",       view: 560,  sky: ["#5b4331", "#2a1c14"], sub: "Pews, candles and stained glass" },
      { name: "The Crypt",          at: 1000, scene: "crypt",      view: 1250, sky: ["#262a47", "#10111f"], sub: "Beneath the altar, the saints sleep" },
      { name: "The Catacombs",      at: 4000, scene: "catacombs",  view: 4500, sky: ["#2f2013", "#120a06"], sub: "Where the first Christians hid and prayed" },
      { name: "The Holy of Holies", at: 6000, scene: "holy",       view: 7000, sky: ["#f2c14e", "#fff4c9"], sub: "Deep calls to deep" },
    ],
  };
})(window.CX = window.CX || {});
