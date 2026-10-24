"""Wikipedia lookups (title resolution + 12 months of human pageviews), cached on disk so re-runs are fast."""
import json, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

CACHE_FILE = Path(__file__).resolve().parent / ".cache" / "wiki.json"
UA = "CrossillionBuilder/1.0 (a hobby trivia game; https://github.com)"


def window():
    """The last 12 FULL months, as (start, end) dates."""
    today = date.today()
    end = today.replace(day=1) - timedelta(days=1)
    start = (end.replace(day=1) - timedelta(days=334)).replace(day=1)
    return start, end


def _get(url, retries=8):
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(2 + 2 * attempt)          # 429 etc: back off
        except Exception:
            time.sleep(1 + attempt)
    return None


class Wiki:
    def __init__(self, offline=False):
        self.offline = offline
        self.data = json.loads(CACHE_FILE.read_text()) if CACHE_FILE.exists() else {"titles": {}, "views": {}}
        self.start, self.end = window()

    def save(self):
        CACHE_FILE.parent.mkdir(exist_ok=True)
        CACHE_FILE.write_text(json.dumps(self.data, ensure_ascii=False))

    # ---- titles: "Book of Genesis" -> (final title, is_missing, is_disambiguation)
    def resolve(self, titles):
        todo = sorted({t for t in titles if t not in self.data["titles"]})
        if todo and self.offline:
            print(f"  offline: {len(todo)} article titles are not cached and will be skipped", file=sys.stderr)
        elif todo:
            print(f"  resolving {len(todo)} new article titles...", file=sys.stderr)
            for i in range(0, len(todo), 40):
                chunk = todo[i:i + 40]
                q = urllib.parse.urlencode({"action": "query", "format": "json", "redirects": 1, "prop": "pageprops",
                                            "ppprop": "disambiguation", "titles": "|".join(chunk)})
                d = _get("https://en.wikipedia.org/w/api.php?" + q)
                if not d:
                    continue
                q = d["query"]
                mapping = {t: t for t in chunk}
                for kind in ("normalized", "redirects"):
                    for r in q.get(kind, []):
                        for k, v in mapping.items():
                            if v == r["from"]:
                                mapping[k] = r["to"]
                pages = {p["title"]: p for p in q["pages"].values()}
                for orig, final in mapping.items():
                    p = pages.get(final, {})
                    self.data["titles"][orig] = [final, "missing" in p, "disambiguation" in p.get("pageprops", {})]
            self.save()
        return {t: tuple(self.data["titles"][t]) for t in titles if t in self.data["titles"]}

    # ---- views: total human pageviews over the window
    def views(self, titles):
        key = lambda t: f"{t}|{self.start}|{self.end}"
        todo = sorted({t for t in titles if key(t) not in self.data["views"]})
        if todo and self.offline:
            print(f"  offline: {len(todo)} pageview counts are not cached and will be skipped", file=sys.stderr)
        elif todo:
            print(f"  downloading pageviews for {len(todo)} articles...", file=sys.stderr)
            def one(t):
                url = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/"
                       f"{urllib.parse.quote(t.replace(' ', '_'), safe='')}/monthly/{self.start:%Y%m%d}00/{self.end:%Y%m%d}00")
                d = _get(url)
                return sum(i["views"] for i in d["items"]) if d else None
            with ThreadPoolExecutor(5) as ex:
                for t, v in zip(todo, ex.map(one, todo)):
                    if v is not None:
                        self.data["views"][key(t)] = v
            self.save()
        return {t: self.data["views"].get(key(t)) for t in titles}
