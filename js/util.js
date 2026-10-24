/* util.js - small helpers shared by everything: DOM lookup, number/HTML formatting, saved data, seeded random, events. */
(function (CX) {
  "use strict";

  CX.$ = id => document.getElementById(id);
  CX.fmt = n => n.toLocaleString("en-US");
  CX.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  CX.rnd = (a, b) => a + Math.random() * (b - a);
  CX.todayKey = () => new Date().toISOString().slice(0, 10);          // the daily game changes at midnight UTC

  /* saved data (the daily result, stats, sound settings). Never throws: private windows can block storage. */
  CX.store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(CX.config.storagePrefix + key)) ?? fallback; } catch { return fallback; } },
    set(key, value)    { try { localStorage.setItem(CX.config.storagePrefix + key, JSON.stringify(value)); } catch {} },
  };

  /* seeded random numbers, so everybody gets the same daily game */
  CX.hashStr = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h; };
  CX.rng = seed => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* a tiny event bus so modules can talk without knowing about each other:  CX.bus.on("zone", fn)  /  CX.bus.emit("zone", data) */
  const handlers = {};
  CX.bus = {
    on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); },
    emit(name, data) { (handlers[name] || []).forEach(fn => fn(data)); },
  };
})(window.CX = window.CX || {});
