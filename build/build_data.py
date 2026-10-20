#!/usr/bin/env python3
"""
Builds data/answers.js for Crossillion from real Wikipedia pageview data.

For every answer in build/entries.txt it:
  1. resolves the article title (follows redirects, flags missing / disambiguation pages)
  2. downloads the last 12 full months of human (non-bot) pageviews
  3. ranks the answers inside each prompt and assigns a rarity tier

Run:  python3 build/build_data.py
"""
import json, re, sys, time, unicodedata, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "CrossillionBuilder/1.0 (https://github.com; contact: funk3ymonkey19@gmail.com)"

# Tier cut-offs: share of answers (by popularity rank, most popular first). Same six tiers as Krillion.
TIERS = [
    ("plankton", 0.10),    # the very commonest answers
    ("clever", 0.30),
    ("schooler", 0.55),
    ("rare", 0.80),
    ("deepcut", 0.93),
    ("crossillion", 1.00), # the rarest 7 %
]


def get(url):
    for attempt in range(8):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(2 + 2 * attempt)   # 429 etc: back off
        except Exception:
            time.sleep(1 + attempt)
    return None


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def parse():
    cats, cur = [], None
    for line in (ROOT / "build/entries.txt").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"\[(\w+)\]\s*(.+)", line)
        if m:
            cur = {"id": m.group(1), "prompt": m.group(2), "entries": []}
            cats.append(cur)
            continue
        parts = [p.strip() for p in line.split("|")]
        name = parts[0]
        article = parts[1] if len(parts) > 1 and parts[1] else name
        aliases = [a.strip() for a in parts[2].split(";")] if len(parts) > 2 else []
        cur["entries"].append({"name": name, "article": article, "aliases": aliases})
    return cats


def resolve_titles(titles):
    """title -> (final_title, is_missing, is_disambig)"""
    out = {}
    titles = sorted(set(titles))
    for i in range(0, len(titles), 40):
        chunk = titles[i:i + 40]
        q = urllib.parse.urlencode({
            "action": "query", "format": "json", "redirects": 1, "prop": "pageprops",
            "ppprop": "disambiguation", "titles": "|".join(chunk),
        })
        d = get("https://en.wikipedia.org/w/api.php?" + q)
        if not d:
            print("resolve failed for chunk", i, file=sys.stderr)
            continue
        q = d["query"]
        mapping = {t: t for t in chunk}
        for n in q.get("normalized", []):
            for k, v in mapping.items():
                if v == n["from"]:
                    mapping[k] = n["to"]
        for r in q.get("redirects", []):
            for k, v in mapping.items():
                if v == r["from"]:
                    mapping[k] = r["to"]
        pages = {p["title"]: p for p in q["pages"].values()}
        for orig, final in mapping.items():
            p = pages.get(final, {})
            out[orig] = (final, "missing" in p, "disambiguation" in p.get("pageprops", {}))
    return out


def month_range():
    today = date.today()
    end = today.replace(day=1) - timedelta(days=1)          # last day of previous month
    start = (end.replace(day=1) - timedelta(days=334)).replace(day=1)  # 12 full months
    return start, end


def views(title, start, end):
    t = urllib.parse.quote(title.replace(" ", "_"), safe="")
    url = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/"
           f"all-access/user/{t}/monthly/{start:%Y%m%d}00/{end:%Y%m%d}00")
    d = get(url)
    if not d:
        return None
    return sum(i["views"] for i in d["items"])


def main():
    cats = parse()
    start, end = month_range()
    print(f"Window: {start} -> {end}")
    resolved = resolve_titles([e["article"] for c in cats for e in c["entries"]])

    jobs = {}
    for c in cats:
        for e in c["entries"]:
            final, missing, disamb = resolved.get(e["article"], (e["article"], True, False))
            e["final"], e["missing"], e["disamb"] = final, missing, disamb
            if not missing and not disamb:
                jobs[final] = None
    with ThreadPoolExecutor(3) as ex:
        for title, v in zip(jobs, ex.map(lambda t: views(t, start, end), list(jobs))):
            jobs[title] = v

    problems, result = [], []
    for c in cats:
        seen, kept = {}, []
        for e in c["entries"]:
            v = jobs.get(e["final"])
            if e["missing"] or e["disamb"] or v is None:
                problems.append(f'{c["id"]}: "{e["name"]}" -> {e["article"]} '
                                f'({"missing" if e["missing"] else "disambiguation" if e["disamb"] else "no data"})')
                continue
            if e["final"] in seen:                       # duplicate article: merge aliases
                seen[e["final"]]["aliases"] += [e["name"]] + e["aliases"]
                continue
            seen[e["final"]] = e
            kept.append(e)
        kept.sort(key=lambda e: -jobs[e["final"]])
        n = len(kept)
        entries = []
        for rank, e in enumerate(kept):
            frac = (rank + 0.5) / n
            tier = next(t for t, cut in TIERS if frac <= cut)
            names = {norm(e["name"]), norm(e["final"]), norm(re.sub(r"\(.*?\)", "", e["final"]))}
            names |= {norm(a) for a in e["aliases"]}
            names.discard("")
            entries.append({
                "n": e["name"], "w": e["final"].replace(" ", "_"), "v": jobs[e["final"]],
                "r": rank + 1, "t": tier, "a": sorted(names),
            })
        result.append({"id": c["id"], "prompt": c["prompt"], "total": n, "entries": entries})

    out = {
        "generated": date.today().isoformat(),
        "window": [start.isoformat(), end.isoformat()],
        "source": "Wikimedia REST API - human pageviews, en.wikipedia.org",
        "categories": result,
    }
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data/answers.js").write_text(
        "window.CROSSILLION_DATA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    total = sum(c["total"] for c in result)
    print(f"Wrote data/answers.js  ({len(result)} prompts, {total} answers)")
    if problems:
        print(f"\n{len(problems)} entries dropped:")
        print("\n".join("  " + p for p in problems))


if __name__ == "__main__":
    main()
