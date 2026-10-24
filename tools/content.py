"""Reads the files you edit by hand in content/ (questions, fact filters, generator settings)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
SPECIAL = {"facts.txt", "constraints.txt"}
KNOWN_OPTIONS = {"letters", "noun", "strip", "roman"}
HEADER = re.compile(r"^\[(\w+)\]\s*(.*?)\s*(?:\{([^}]*)\})?\s*$")


def question_files():
    """bible, church, people, culture first (in that order), then any other topic file you add."""
    first = [CONTENT / f"{n}.txt" for n in ("bible", "church", "people", "culture")]
    others = sorted(p for p in CONTENT.glob("*.txt") if p.name not in SPECIAL and p not in first)
    return [p for p in first + others if p.exists()]


def parse_options(text):
    opts = {}
    for token in (text or "").split(","):
        token = token.strip()
        if not token:
            continue
        key, _, val = token.partition("=")
        opts[key.strip()] = val.strip() if _ else True
    return opts


def load_questions():
    """-> (list of questions, list of problems). A question is {id, prompt, opts, file, entries[]}."""
    cats, problems, seen_ids = [], [], {}
    for path in question_files():
        cur = None
        for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            m = HEADER.match(line) if line.startswith("[") else None
            if m:
                cid, prompt, opts = m.group(1), m.group(2), parse_options(m.group(3))
                for k in opts:
                    if k not in KNOWN_OPTIONS:
                        problems.append(f"{path.name}:{n}  unknown option '{k}' on [{cid}] (allowed: {', '.join(sorted(KNOWN_OPTIONS))})")
                if cid in seen_ids:
                    problems.append(f"{path.name}:{n}  question id [{cid}] is already used in {seen_ids[cid]}")
                if not prompt:
                    problems.append(f"{path.name}:{n}  [{cid}] has no question text")
                seen_ids[cid] = path.name
                cur = {"id": cid, "prompt": prompt, "opts": opts, "file": path.name, "entries": []}
                cats.append(cur)
                continue
            if cur is None:
                problems.append(f"{path.name}:{n}  an answer appears before any [id] question line")
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) > 3:
                problems.append(f"{path.name}:{n}  too many '|' separators: {line[:60]}")
            name = parts[0]
            if not name:
                problems.append(f"{path.name}:{n}  empty answer name")
                continue
            article = parts[1] if len(parts) > 1 and parts[1] else name
            aliases = [a.strip() for a in parts[2].split(";") if a.strip()] if len(parts) > 2 else []
            cur["entries"].append({"name": name, "article": article, "aliases": aliases, "line": n})
    return cats, problems


def load_facts():
    """-> list of {id, prompt, src[], names[(name, optional)]} from content/facts.txt"""
    facts, cur = [], None
    path = CONTENT / "facts.txt"
    if not path.exists():
        return facts
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^\[fact:(\w+)\]\s*(.+)$", line)
        if m:
            cur = {"id": m.group(1), "prompt": m.group(2).strip(), "src": [], "names": []}
            facts.append(cur)
        elif cur is not None and line.lower().startswith("from:"):
            cur["src"] = [s.strip() for s in line[5:].split(",") if s.strip()]
        elif cur is not None:
            for nm in line.split(";"):
                nm = nm.strip()
                if nm:
                    cur["names"].append((nm.rstrip("?").strip(), nm.endswith("?")))
    return facts


def load_constraints():
    cfg = {}
    path = CONTENT / "constraints.txt"
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if ":" not in line:
            continue
        k, v = (s.strip() for s in line.split(":", 1))
        cfg[k] = float(v) if "." in v else int(v)
    return cfg


def check(cats, problems):
    """Extra checks used by `build.py --check`. Returns a list of warnings."""
    warns = list(problems)
    prompts = {}
    for c in cats:
        if c["prompt"] in prompts:
            warns.append(f"{c['id']}: same question text as [{prompts[c['prompt']]}]")
        prompts[c["prompt"]] = c["id"]
        if len(c["entries"]) < 20:
            warns.append(f"{c['id']}: only {len(c['entries'])} answers (aim for 25 or more so the six tiers have room)")
        arts, names = {}, {}
        for e in c["entries"]:
            if e["article"].lower() in arts and arts[e["article"].lower()] != e["name"]:
                warns.append(f"{c['file']}:{e['line']}  [{c['id']}] '{e['name']}' and '{arts[e['article'].lower()]}' use the same article '{e['article']}'")
            arts[e["article"].lower()] = e["name"]
            if e["name"].lower() in names:
                warns.append(f"{c['file']}:{e['line']}  [{c['id']}] '{e['name']}' is listed twice")
            names[e["name"].lower()] = 1
    return warns
