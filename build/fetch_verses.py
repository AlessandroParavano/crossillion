#!/usr/bin/env python3
"""
Builds data/verses.js: a pool of random ESV verses for the "verse of the day" on the cross.

How it stays random: every run picks chapters at random from the WHOLE Bible (all 1,189 chapters),
downloads each chapter from esv.org, and keeps a few random verses from it. Nothing is hand-picked,
so every run produces a different pool.

Pool size is capped at 450 verses: the ESV's free-quotation allowance is 500 verses. Re-run for a fresh pool.

    python3 build/fetch_verses.py
"""
import html, json, random, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

CHAPTERS = [("Genesis",50),("Exodus",40),("Leviticus",27),("Numbers",36),("Deuteronomy",34),("Joshua",24),("Judges",21),("Ruth",4),
("1 Samuel",31),("2 Samuel",24),("1 Kings",22),("2 Kings",25),("1 Chronicles",29),("2 Chronicles",36),("Ezra",10),("Nehemiah",13),("Esther",10),
("Job",42),("Psalm",150),("Proverbs",31),("Ecclesiastes",12),("Song of Solomon",8),("Isaiah",66),("Jeremiah",52),("Lamentations",5),("Ezekiel",48),
("Daniel",12),("Hosea",14),("Joel",3),("Amos",9),("Obadiah",1),("Jonah",4),("Micah",7),("Nahum",3),("Habakkuk",3),("Zephaniah",3),("Haggai",2),
("Zechariah",14),("Malachi",4),("Matthew",28),("Mark",16),("Luke",24),("John",21),("Acts",28),("Romans",16),("1 Corinthians",16),("2 Corinthians",13),
("Galatians",6),("Ephesians",6),("Philippians",4),("Colossians",4),("1 Thessalonians",5),("2 Thessalonians",3),("1 Timothy",6),("2 Timothy",4),
("Titus",3),("Philemon",1),("Hebrews",13),("James",5),("1 Peter",5),("2 Peter",3),("1 John",5),("2 John",1),("3 John",1),("Jude",1),("Revelation",22)]
assert sum(n for _, n in CHAPTERS) == 1189

POOL, PER_CHAPTER = 450, 3
UA = "Mozilla/5.0 (Crossillion verse builder)"
rng = random.SystemRandom()

def page(book, ch):
    url = "https://www.esv.org/" + urllib.parse.quote(f"{book} {ch}".replace(" ", "+"), safe="+") + "/"
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            time.sleep(2 * (attempt + 1))
    return None

def verses(h, prefix):
    """-> {verse_number: text} for ONE chapter. `prefix` is the 5-digit book+chapter code (e.g. 08002 = Ruth 2);
    the page also embeds cross-reference previews from other chapters, which are ignored."""
    out = {}
    for p in re.split(r'(?=<span class="verse" data-ref=")', h)[1:]:
        ref = re.match(r'<span class="verse" data-ref="(\d{5})(\d{3})"', p)
        if not ref or ref.group(1) != prefix: continue
        num = int(ref.group(2))
        t = p.split("</section>")[0]
        t = re.sub(r"<h\d.*?</h\d>", " ", t, flags=re.S)                        # section headings
        t = re.sub(r"<sup.*?</sup>", "", t, flags=re.S)                          # footnote + cross-reference markers
        t = re.sub(r'<b class="(?:verse|chapter)-num[^"]*"[^>]*>.*?</b>', "", t, flags=re.S)
        t = re.sub(r'<span class="small-caps-upper"[^>]*>(.*?)</span><span class="small-caps-lower"[^>]*>(.*?)</span>',
                   lambda m: (m.group(1) + m.group(2)).upper(), t, flags=re.S)  # LORD / GOD
        t = re.sub(r'<span class="(?:line|indent)[^>]*>|<br[^>]*>|</p>', " ", t)  # poetry lines / paragraphs -> spaces
        t = re.sub(r"<[^>]+>", "", t)
        t = html.unescape(t).replace("\xa0", " ")
        t = re.sub(r"\s+", " ", t).strip()
        t = re.sub(r"\s+([,.;:!?”’)])", r"\1", t)
        out[num] = (out.get(num, "") + " " + t).strip()
    return out

def main():
    target = POOL
    pool, seen = [], set()
    allch = [(b, c, i + 1) for i, (b, n) in enumerate(CHAPTERS) for c in range(1, n + 1)]
    rng.shuffle(allch)
    for book, ch, bi in allch:
        if len(pool) >= target: break
        h = page(book, ch); time.sleep(0.5)
        if not h: continue
        vs = {n: t for n, t in verses(h, f'{bi:02d}{ch:03d}').items() if 35 <= len(t) <= 320}
        if not vs: continue
        for n in rng.sample(sorted(vs), min(PER_CHAPTER, len(vs))):
            if len(pool) >= target: break
            ref = f"{book} {ch}:{n}"
            if ref in seen: continue
            seen.add(ref)
            t = vs[n]; t = t[0].upper() + t[1:]
            pool.append({"ref": ref, "text": t})
        print(f"{len(pool)}/{target}  {book} {ch}", flush=True)
    rng.shuffle(pool)
    Path(__file__).resolve().parent.parent.joinpath("data/verses.js").write_text(
        "window.CROSSILLION_VERSES = " + json.dumps(pool, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Wrote data/verses.js ({len(pool)} verses from {len({p['ref'].rsplit(' ',1)[0] for p in pool})} books/psalm-groups)")

if __name__ == "__main__":
    main()
