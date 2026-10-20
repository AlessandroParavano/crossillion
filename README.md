# Crossillion

A daily Christian trivia game in the style of Krillion. Seven prompts, 20 seconds each. Name something from the faith: the rarer your answer, the deeper you descend. You start on the street outside a church and sink through five zones, each more sacred than the last: **The Sunday Street → The Nave → The Crypt → The Catacombs → The Holy of Holies**. A perfect run reaches 7,000 meters.

| Tier | Meters |
|---|---|
| Pew Warmer | 100 m |
| Pharisee | 150 m |
| Sunday Schooler | 300 m |
| Seminarian | 600 m |
| Desert Father | 850 m |
| One in a Crossillion | 1,000 m |

Values, timing and zone depths follow Krillion: 7 prompts, a 3-second preview then 25 seconds to answer, a perfect run of 7,000 m, and zones starting at 0 / 200 / 1,000 / 4,000 / 6,000 m (The Sunday Street, The Nave, The Crypt, The Catacombs, The Holy of Holies).

## Deploying on GitHub Pages
It is a static site with no build step and no dependencies. Push the repo, then go to **Settings → Pages → Deploy from branch → `main` / root**.

## Where the rarity data comes from
Google Search volume has no public API, so Crossillion uses the **Wikimedia Pageviews API** (public, free, no key). It is a real, reproducible measure of how often people look something up.

- Every answer maps to an English Wikipedia article (redirects are resolved, and disambiguation pages are rejected).
- The score is the sum of **human (non-bot) pageviews over the last 12 full months**.
- Within each prompt, answers are ranked by popularity and split into the six tiers: top 10% Pew Warmer, next 20% Pharisee, next 25% Sunday Schooler, next 25% Seminarian, next 13% Desert Father, rarest 7% One in a Crossillion.

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

## Files
- `index.html`, `style.css`, `game.js`: the game
- `world.js`: the five scrolling zone scenes and the depth ruler
- `data/answers.js`: generated answer and rarity data
- `build/`: the answer list and the data builder

The daily prompts are chosen from the UTC date, so everyone gets the same Descent. Progress and stats are stored in the browser's localStorage only.
