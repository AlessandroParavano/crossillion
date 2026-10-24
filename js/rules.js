/* rules.js - how scores and zones are worked out from the settings in config.js. */
(function (CX) {
  "use strict";
  const cfg = CX.config;

  /* which tier is an answer?  rank 1 = the most-looked-up answer in its question */
  function tierIndex(rank, total) {
    const frac = (rank - 0.5) / total;
    const i = cfg.tiers.findIndex(t => frac <= t.cutoff);
    return i < 0 ? cfg.tiers.length - 1 : i;
  }
  const tierOf = (entry, cat) => cfg.tiers[tierIndex(entry.r, cat.total)];

  /* which zone is a depth in?  (the zone you are in once you pass its starting depth) */
  const zoneIndex = depth => cfg.zones.reduce((n, z, i) => (depth >= z.at ? i : n), 0);
  const zoneAt = depth => cfg.zones[zoneIndex(depth)];

  CX.rules = { tierIndex, tierOf, zoneIndex, zoneAt };
})(window.CX = window.CX || {});
