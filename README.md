# Crossillion

A daily Christian trivia game in the style of Krillion. Seven prompts, 20 seconds each. Name something from the faith: the rarer your answer, the deeper you descend. You start on the street outside a church and sink through five zones, each more sacred than the last: **The Sunday Street → The Nave → The Crypt → The Catacombs → The Holy of Holies**. A perfect run reaches 7,000 meters.

| Tier | Meters |
|---|---|
| Flock | 100 m |
| Pharisee | 150 m |
| Sunday Schooler | 300 m |
| Seminarian | 600 m |
| Theologian | 850 m |
| Burning Bush | 1,000 m |

Values, timing and zone depths follow Krillion: 7 prompts, a 3-second preview then 25 seconds to answer, a perfect run of 7,000 m, and zones starting at 0 / 200 / 1,000 / 4,000 / 6,000 m (The Sunday Street, The Nave, The Crypt, The Catacombs, The Holy of Holies).

## Deploying on GitHub Pages
It is a static site with no build step and no dependencies. Push the repo, then go to **Settings → Pages → Deploy from branch → `main` / root**.

## Where the rarity data comes from
Google Search volume has no public API, so Crossillion uses the **Wikimedia Pageviews API** (public, free, no key). It is a real, reproducible measure of how often people look something up.

- Every answer maps to an English Wikipedia article (redirects are resolved, and disambiguation pages are rejected).
- The score is the sum of **human (non-bot) pageviews over the last 12 full months**.
- Within each prompt, answers are ranked by popularity and split into the six tiers: top 10% Flock, next 20% Pharisee, next 25% Sunday Schooler, next 25% Seminarian, next 13% Theologian, rarest 7% Burning Bush.

**Limits to know about:**
- Tiers are *relative to the answer list for that prompt*, not to what other players typed (a static site has no server to collect that).
- Pageviews measure public curiosity, which is not always the same as how well-known something is. Recent news (for example a new pope) inflates a page.
- Answers that aren't in the list show "Not in our records". The answer bank has about 800 entries across 16 prompts. Add more in `build/entries.txt`.

## Refreshing or extending the data
```bash
# edit build/entries.txt:   Display name | Wikipedia article | alias;alias
python3 build/build_data.py     # needs internet, Python 3 standard library only
```
This regenerates `data/answers.js` and prints any entry it could not resolve. Re-run it once a year or so to refresh the numbers.

## Touching the cross: verse of the day (ESV)
Tap the cross on the home screen for a holy glow and a verse. Everyone gets the same random verse each day (chosen from the UTC date), and **Another verse** draws a fresh random one. Tapping the cross during a descent only plays the glow, so the clock isn't disturbed.

`data/verses.js` holds **450 verses picked at random from the whole Bible**, with the ESV wording downloaded from esv.org. `python3 build/fetch_verses.py` picks random chapters across all 66 books and keeps random verses from them, so every run produces a different pool. The pool is capped at 450 because the ESV's free-quotation allowance is 500 verses. The ESV copyright notice is shown on the verse card and must stay there.

## Files
- `index.html`, `style.css`, `game.js`: the game
- `world.js`: the five scrolling zone scenes and the depth ruler
- `data/answers.js`: generated answer and rarity data
- `data/verses.js`: the 450 random ESV verses
- `build/`: the answer list and the data builder

The daily prompts are chosen from the UTC date, so everyone gets the same Descent. Progress and stats are stored in the browser's localStorage only.
