"""
Builds the extra questions that are DERIVED from answers you already have, re-ranking only the answers that fit:

  * letter / length / vowel rules   "Name a pope whose name starts with L", "...with both an A and an N in its name"
  * fact filters (content/facts.txt) "Name a female saint", "Name a pope from before the year 1000"

Which kinds, and how many, are set in content/constraints.txt.
"""
import hashlib, re, sys, unicodedata

VOWELS = set("aeiou")
NUM = {4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve"}


def _ascii(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))


def core(name, opts):
    """The name as a letter rule reads it: lower case, no accents, leading 'The'/'Saint'/'Pope'/'Mount' and a
    trailing Roman numeral removed (so 'Pope Leo XIV' counts as 'leo')."""
    s = _ascii(name).lower().strip()
    prefixes = ["the "] + [p.strip() + " " for p in str(opts.get("strip", "")).split("|") if p.strip() and opts.get("strip") is not True]
    again = True
    while again:
        again = False
        for p in prefixes:
            if s.startswith(p):
                s, again = s[len(p):], True
    if opts.get("roman"):
        s = re.sub(r"\s+(?:[ivxlc]+|jr\.?)$", "", s)
    return s


def letters(s):
    return re.sub(r"[^a-z]", "", s)


def rule_fn(kind, arg):
    a = arg.lower() if isinstance(arg, str) else arg
    return {
        "starts":      lambda s, l: s[:1] == a,
        "ends":        lambda s, l: l[-1:] == a,
        "contains":    lambda s, l: a in l,
        "both":        lambda s, l: all(c in l for c in a),
        "without":     lambda s, l: a not in l,
        "len_eq":      lambda s, l: len(l) == a,
        "len_ge":      lambda s, l: len(l) >= a,
        "one_vowel":   lambda s, l: len(set(l) & VOWELS) == 1,
        "two_cons":    lambda s, l: len(l) > 1 and l[0] not in VOWELS and l[1] not in VOWELS and s[:2].isalpha(),
        "double":      lambda s, l: any(re.search(r"(.)\1", w) for w in re.sub(r"[^a-z]", " ", s).split()),
        "vowel_start": lambda s, l: s[:1] in VOWELS,
        "two_words":   lambda s, l: len(re.sub(r"[^a-z ]", "", s).split()) == 2,
        "many_words":  lambda s, l: len(re.sub(r"[^a-z ]", "", s).split()) >= 3,
    }[kind]


def phrase(kind, arg, noun, example, flip):
    L = arg if isinstance(arg, str) else ""
    return {
        "starts":      lambda: f"whose {noun} starts with " + (f"the letter {L}" if flip else L),
        "ends":        lambda: f"whose {noun} ends in the letter {L}",
        "contains":    lambda: f"with the letter {L} in its {noun}",
        "both":        lambda: f"with both {L[0]} and {L[1]} in its {noun}",
        "without":     lambda: f"without the letter {L} in its {noun}",
        "len_eq":      lambda: f"with a {NUM[arg]}-letter {noun}",
        "len_ge":      lambda: f"with {arg} or more letters in its {noun}",
        "one_vowel":   lambda: f"whose {noun} uses only one vowel letter, repeats allowed (like {example})",
        "two_cons":    lambda: f"whose {noun} starts with two consonants (like {example})",
        "double":      lambda: f"with a double letter in its {noun} (like {example})",
        "vowel_start": lambda: f"whose {noun} starts with a vowel",
        "two_words":   lambda: f"whose {noun} is exactly two words long",
        "many_words":  lambda: f"whose {noun} is three or more words long",
    }[kind]()


def candidate_rules():
    """Every (kind, argument) the generator will try."""
    r = [("starts", ch) for ch in "ABCDEFGHIJKLMNOPRSTUVWZ"] + [("ends", ch) for ch in "AEHNSTYDLOR"]
    r += [("contains", ch) for ch in "ZXQKJVWYFBG"]
    r += [("both", a + b) for a in "AEIO" for b in "BCDGHKLMNPRSTW" if a != b]
    r += [("without", ch) for ch in "AEIORSNTH"]
    r += [("len_eq", n) for n in range(4, 10)] + [("len_ge", n) for n in range(9, 14)]
    r += [(k, None) for k in ("one_vowel", "two_cons", "double", "vowel_start", "two_words", "many_words")]
    return r


def _rank(entries):
    es = sorted(({**e} for e in entries), key=lambda e: -e["v"])
    for i, e in enumerate(es):
        e["r"] = i + 1
    return es


def _make(cid, prompt, src, entries, rule):
    es = _rank(entries)
    return {"id": cid, "prompt": prompt, "total": len(es), "entries": es, "src": src, "rule": rule}


def _h(*parts):
    return hashlib.sha1("|".join(map(str, parts)).encode()).hexdigest()


def generate_rules(cats, cfg):
    """Letter/length/vowel questions. Selection is by hash, so adding new content does not reshuffle old picks."""
    min_pool, max_pool, share = cfg.get("min_pool", 9), cfg.get("max_pool", 45), cfg.get("max_share", 0.6)
    per_source, seed = cfg.get("per_source", 2), cfg.get("seed", 2026)
    kinds = [k for k in ("starts", "ends", "contains", "both", "without", "len_eq", "len_ge", "one_vowel", "two_cons",
                         "double", "vowel_start", "two_words", "many_words") if cfg.get(k, 0) > 0]
    cands = {}
    for c in cats:
        if not c["opts"].get("letters") or len(c["entries"]) < 40:
            continue
        info = []
        for e in c["entries"]:
            s = core(e["n"], c["opts"])
            info.append((e, s, letters(s)))
        for kind, arg in candidate_rules():
            if kind not in kinds:
                continue
            fn = rule_fn(kind, arg)
            sub = [e for e, s, l in info if s and fn(s, l)]
            if min_pool <= len(sub) <= min(max_pool, int(share * len(c["entries"]))):
                cands.setdefault(kind, []).append((c, arg, sub))
    out, used = [], {}
    for kind in kinds:
        pool = sorted(cands.get(kind, []), key=lambda t: _h(seed, kind, t[0]["id"], t[1]))
        got = 0
        for c, arg, sub in pool:
            if got >= cfg[kind]:
                break
            if used.get(c["id"], 0) >= per_source:
                continue
            noun = c["opts"].get("noun", "name")
            ph = phrase(kind, arg, noun, sub[0]["n"], int(_h(seed, "flip", c["id"], arg), 16) % 2)
            out.append(_make(f"{c['id']}_{kind}_{arg if arg is not None else 'x'}", f"{c['prompt']} {ph}", [c["id"]], sub, ph))
            used[c["id"]] = used.get(c["id"], 0) + 1
            got += 1
        if got < cfg[kind]:
            print(f"  note: only {got} of {cfg[kind]} '{kind}' questions could be generated", file=sys.stderr)
    return out


def generate_facts(cats, facts):
    byid = {c["id"]: c for c in cats}
    norm = lambda s: _ascii(s.lower()).strip()
    out = []
    for f in facts:
        missing_src = [s for s in f["src"] if s not in byid]
        if missing_src:
            print(f"  [fact:{f['id']}] unknown source question(s): {missing_src}", file=sys.stderr)
            continue
        pool = {}
        for sid in f["src"]:
            for e in byid[sid]["entries"]:
                for key in {norm(e["n"]), *e["a"]}:
                    pool.setdefault(key, e)
        picked, missing, seen = [], [], set()
        for nm, optional in f["names"]:
            e = pool.get(norm(nm))
            if not e:
                if not optional:
                    missing.append(nm)
                continue
            if e["w"] not in seen:
                seen.add(e["w"]); picked.append(e)
        if missing:
            print(f"  [fact:{f['id']}] not found among the answers: {missing}", file=sys.stderr)
        if len(picked) < 9:
            print(f"  [fact:{f['id']}] only {len(picked)} usable answers, skipped (needs 9)", file=sys.stderr)
            continue
        out.append(_make(f"fact_{f['id']}", f["prompt"], f["src"], picked, f["prompt"]))
    return out
