# content/ - everything you edit by hand

This folder is the *only* place you need to touch to add or change questions.
The game never reads these files directly: `python3 tools/build.py` turns them into `data/answers.js`.

| File | What it holds |
|---|---|
| `bible.txt`   | Bible books, people, places, stories, names of God, relics, Revelation, translations |
| `church.txt`  | symbols, buildings, worship, prayers, the church calendar, orders, institutions, hymns, history |
| `people.txt`  | saints, popes, thinkers, Church Fathers, martyrs, missionaries, rulers... |
| `culture.txt` | Christian books, music, film and art |
| `facts.txt`   | hand-made filter questions ("Name a female saint") built from answers that already exist |
| `constraints.txt` | settings for the generated letter/length questions ("...whose name starts with J") |

You can add more topic files (for example `sports.txt`); any `.txt` here other than `facts.txt` and `constraints.txt` is read automatically.

## A question

```
[popes] Name a pope   {letters, strip=pope, roman}
Pope Francis | Pope Francis | francis;jorge bergoglio
Pope Leo XIV | Pope Leo XIV | leo xiv
Pope Linus
```

* `[popes]` is a short **id** (letters, numbers, underscore). It must be unique across all files.
* The rest of that line is the **question** the player sees.
* Each following line is **one answer**:  `Display name | Wikipedia article | alias;alias`
  * **Display name** - what the result card shows.
  * **Wikipedia article** - the exact English Wikipedia title. This is where the rarity comes from (see below). Leave it out if it is the same as the display name.
  * **aliases** - other ways a player might type it (separate with `;`). Typed text is already forgiving about capitals, accents, punctuation, a leading "the / saint / pope / mount", and small typos, so only add real alternatives ("jorge bergoglio").
* Blank lines and lines starting with `#` are ignored.

Aim for **25 or more answers** per question so all six rarity tiers have room (`python3 tools/build.py --check` warns below 20).

### Options (optional, in braces on the question line)

| Option | Effect |
|---|---|
| `letters` | the question also feeds the generated letter/length questions (needs 40+ answers) |
| `noun=title` | wording for those: "whose **title** starts with J" instead of "whose name" |
| `strip=saint\|st.\|st` | words ignored at the start of a name when reading letters (so "Saint Nicholas" counts as N) |
| `roman` | ignore a trailing Roman numeral ("Pope Leo XIV" counts as "leo") |

## A "fact" question (`facts.txt`)

```
[fact:renaissance_popes] Name a Renaissance pope (1447 to 1590)
from: popes
Pope Nicholas V; Pope Callixtus III; Pope Pius II; Pope Sixtus IV
```

It borrows answers that already exist in the questions listed after `from:` (matched by display name or alias), and ranks them again among themselves. A name ending in `?` is optional. Needs at least 9 answers.

## Generated questions (`constraints.txt`)

"Name a book of the Bible whose name starts with J", "...with both an A and an N in its name", "...with a six-letter name"... are made automatically from every question marked `{letters}`.
Change how many of each kind in `constraints.txt`, or change `seed` to draw a different (but stable) selection.

## Building

```
python3 tools/build.py            build data/answers.js (only downloads what is new)
python3 tools/build.py --check    just check these files for mistakes - no network
python3 tools/build.py --offline  rebuild using only what is already cached
python3 tools/build.py --verses   draw a fresh random pool of ESV verses
```

If an answer's Wikipedia title is wrong (or is a disambiguation page) the build lists it as **dropped** - fix the title and run again. Downloads are cached in `tools/.cache/`.
