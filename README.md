# Crossillion

A daily Christian trivia game in the style of Krillion. Seven questions, a 3-second preview and 25 seconds each. Name something from the faith: **the rarer your answer, the deeper you descend** through five zones, each more sacred than the last: *The Sunday Street, The Nave, The Crypt, The Catacombs, The Holy of Holies*. A perfect game reaches 7,000 meters.

It is a plain static website: no build step, no dependencies. Open `index.html` through any web server (for example `python3 -m http.server`, then visit <http://localhost:8000>) or publish it on GitHub Pages (**Settings > Pages > Deploy from branch > `main` / root**).

## How the project is organised

```
index.html            the page (no questions or settings inside it)
css/                  styles, one file per job: base, world, ui, ruler, effects, responsive
js/                   code, one small file per job (see below)
  config.js             * settings: rounds, timer, rarity tiers, zones - change the game here
  audio/                sound effects and music, all synthesised (no sound files)
content/              * the questions and answers you write            (see content/README.md)
tools/                the build: `python3 tools/build.py` turns content/ into data/
data/                 generated files - never edit by hand (answers.js, verses.js)
dev/sound-lab.html    listen to every sound and music theme
```

The files in `js/` each add themselves to one shared object called `CX`, and are loaded in order by `index.html` (a plain-script setup, so the site also works when opened straight from a folder).

| File | Job |
|---|---|
| `config.js` | all tweakable settings |
| `util.js` | helpers: saved data, seeded random numbers, a tiny event bus |
| `rules.js` | which tier an answer is, which zone a depth is in |
| `matching.js` | forgiving answer matching and "did you mean...?" typo help |
| `rotation.js` | which questions a game uses (the daily cycle, and endless mode) |
| `world.js` | the five scenes, the camera and the depth ruler |
| `audio/engine.js` `sfx.js` `music.js` | the sound system, the effects, the music |
| `effects.js` | the holy glow and the Burning Bush fire |
| `verses.js` | the verse card |
| `share.js` | the shareable result picture |
| `game.js` | one game: the clock, answering, scoring |
| `screens.js` | home / game / results screens and the zone tour |
| `main.js` | starts everything and connects the buttons |

## How do I...

| ...do this | Edit |
|---|---|
| add a question or more answers | a file in `content/`, then `python3 tools/build.py` |
| add a "female saints"-style filter question | `content/facts.txt` |
| rename a tier, change its meters or colour | `tiers` in `js/config.js` (changes everywhere, no rebuild) |
| change the timer, the number of questions | `js/config.js` |
| move a zone's depth, rename a zone | `zones` in `js/config.js` |
| add a new zone | a zone entry in `js/config.js` + a drawing in `js/world.js` (+ a theme in `js/audio/music.js`) |
| change a sound effect | its recipe in `js/audio/sfx.js` (audition it in `dev/sound-lab.html`) |
| change the music | the theme in `js/audio/music.js` |
| draw a fresh pool of verses | `python3 tools/build.py --verses` |

## Where the rarity comes from

Google search volume has no public API, so rarity uses the **Wikimedia Pageviews API** (public, free, no key): every answer is an English Wikipedia article, and its score is the number of **human (non-bot) pageviews over the last 12 full months**. Inside each question the answers are ranked by that number and split into six tiers using the percentages in `js/config.js`: the most-looked-up 10% are *Flock*, the next 20% *Pharisee*, then 25% *Sunday Schooler*, 25% *Seminarian*, 13% *Theologian*, and the rarest 7% *Burning Bush*.

Limits worth knowing: tiers are relative to the answers *we list* for a question (a static site cannot collect what other players typed); pageviews measure public curiosity, so recent news inflates a page; an answer that is missing from the list shows "Not in our records".

Questions can carry a rule ("whose name starts with J", "a pope from before the year 1000"). Those are ranked only among the answers that fit.

## The cross, the verses and the Burning Bush

Touch the cross on the home screen for a holy glow and a verse. Everyone gets the same random verse each day and *Another verse* draws a fresh one. `data/verses.js` holds 450 verses picked at random from the whole Bible (re-draw with `python3 tools/build.py --verses`), capped at 450 because the ESV's free-quotation allowance is 500 verses. **The ESV copyright notice shown on the verse card must stay there.** Landing on the top tier sets the cross on fire.

## Sound

Sound effects and music are synthesised in the browser with the Web Audio API (no files, nothing to license). The speaker and note buttons in the header switch them on and off and the choice is remembered. Browsers only allow sound after a click or key press, so audio starts on the player's first interaction. `dev/sound-lab.html` plays every sound and theme.

## Daily game

The daily questions come from the UTC date, so everyone gets the same Descent. They walk through a shuffled order of the whole bank, so a question does not return until every other question has had its turn. Progress and stats are kept in the browser's `localStorage` only.
