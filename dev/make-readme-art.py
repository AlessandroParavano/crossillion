#!/usr/bin/env python3
"""Draws the artwork used by README.md into docs/images/ (hero banner, divider, play button, icons, diagrams).

The tiers and zones are read from js/config.js, so the diagrams always match the game.

    python3 dev/make-readme-art.py
"""
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "images"
(OUT / "icons").mkdir(parents=True, exist_ok=True)

cfg = (ROOT / "js" / "config.js").read_text(encoding="utf-8")
TIERS = [dict(name=n, meters=int(m), cutoff=float(c), color=col)
         for n, m, c, col in re.findall(r'name: "([^"]+)",\s*meters: (\d+),\s*cutoff: ([\d.]+),\s*color: "(#[0-9a-fA-F]+)"', cfg)]
ZONES = [dict(name=n, at=int(a), sub=s) for n, a, s in re.findall(r'name: "([^"]+)",\s*at: (\d+),.*?sub: "([^"]+)"', cfg)]
assert len(TIERS) == 6 and len(ZONES) == 5, (len(TIERS), len(ZONES))

CROSS = "M13 3h6v9h9v6h-9v11h-6V18H4v-6h9z"
SANS = "font-family:Montserrat,'Segoe UI','Helvetica Neue',Arial,sans-serif"
MONO = "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"
NOMOTION = "@media (prefers-reduced-motion:reduce){*{animation:none!important}}"

DEFS_BG = '''<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070a1f"/><stop offset=".55" stop-color="#15104a"/><stop offset="1" stop-color="#090c28"/></linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".55" stop-color="#f2c14e"/><stop offset="1" stop-color="#c8872a"/></linearGradient>
  <linearGradient id="goldh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".5" stop-color="#f2c14e"/><stop offset="1" stop-color="#d99a2b"/></linearGradient>
  <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#38bdf8"/><stop offset="1" stop-color="#a78bfa"/></linearGradient>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#8aa4ff" fill-opacity=".07"/></pattern>'''


def save(name, svg):
    (OUT / name).write_text(svg, encoding="utf-8")
    print(f"  docs/images/{name}  {len(svg)//1024 or 1} KB")


# ------------------------------------------------------------------------------------------------ hero
def hero():
    W, H = 1000, 340
    phrases = ["name something from the faith", "the rarer your answer, the deeper you go", "five zones, seven questions, one descent"]
    CW, X0, YT, HOLD = 12.2, 326, 214, 4.6
    cyc = HOLD * len(phrases)
    share = 100 / len(phrases)
    te, he, ee = 0.30 * share, 0.80 * share, 0.94 * share
    css, clips, texts, curs = [], [], [], []
    for i, ph in enumerate(phrases):
        n, w = len(ph), len(ph) * CW
        css.append(f"@keyframes w{i}{{0%{{width:0}}{te:.2f}%{{width:{w:.1f}px}}{he:.2f}%{{width:{w:.1f}px}}{ee:.2f}%{{width:0}}100%{{width:0}}}}"
                   f"@keyframes c{i}{{0%{{transform:translateX(0);opacity:1}}{te:.2f}%{{transform:translateX({w:.1f}px)}}{he:.2f}%{{transform:translateX({w:.1f}px);opacity:1}}{ee-0.1:.2f}%{{transform:translateX(0);opacity:1}}{ee:.2f}%{{opacity:0}}100%{{opacity:0}}}}"
                   f".w{i}{{animation:w{i} {cyc}s steps({n}) {i*HOLD}s infinite}}.c{i}{{opacity:0;animation:c{i} {cyc}s steps({n}) {i*HOLD}s infinite}}")
        clips.append(f'<clipPath id="k{i}"><rect class="w{i}" x="{X0}" y="{YT-22}" width="0" height="32"/></clipPath>')
        texts.append(f'<text clip-path="url(#k{i})" x="{X0}" y="{YT}" textLength="{w:.1f}" lengthAdjust="spacing" class="mono ph">{ph}</text>')
        curs.append(f'<rect class="c{i}" x="{X0+1}" y="{YT-19}" width="9" height="23" fill="#ffe9a8"/>')
    css.append("@media (prefers-reduced-motion:reduce){*{animation:none!important}.w0{width:%.1fpx!important}.c0{opacity:1!important}}" % (len(phrases[0]) * CW))
    rays = "".join(f'<line x1="0" y1="-74" x2="0" y2="-{150 if i % 2 else 128}" transform="rotate({i*22.5})" stroke="#f2c14e" stroke-opacity="{.16 if i % 2 else .1}" stroke-width="{3 if i % 2 else 1.6}" stroke-linecap="round"/>' for i in range(16))
    sparks = "".join(f'<circle class="sp" style="animation-delay:{-(i*0.83)%6:.2f}s;--dx:{(-40+i*11)%90-45}px" cx="{110+(i*47)%120}" cy="{250-(i*13)%30}" r="{1.5+(i%3)*.6}" fill="#ffe9a8"/>' for i in range(11))
    ticks = ""
    for k in range(0, 14):
        y = 44 + k * 18.6
        major = k % 3 == 0
        ticks += f'<line x1="900" y1="{y:.1f}" x2="{916 if major else 908}" y2="{y:.1f}" stroke="#aac3ff" stroke-opacity="{.8 if major else .45}" stroke-width="{1.6 if major else 1}"/>'
        if major:
            ticks += f'<text style="{MONO}" x="922" y="{y+3.5:.1f}" font-size="10" font-weight="600" fill="#8fb0e8">-{k*100+100}m</text>'
    band = "".join(f'<rect x="{i*200}" y="{H-6}" width="200" height="6" fill="{c}"/>' for i, c in enumerate(["#3f9ae6", "#5b4331", "#262a47", "#2a1c12", "#f2c14e"]))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Crossillion - a daily Christian trivia game. The rarer your answer, the deeper you descend.">
<defs>
  {DEFS_BG}
  <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f2c14e" stop-opacity=".42"/><stop offset=".55" stop-color="#8b6cf6" stop-opacity=".12"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></radialGradient>
  <filter id="cglow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="frame"><rect width="{W}" height="{H}" rx="18"/></clipPath>
  {"".join(clips)}
</defs>
<style>
  .sans{{{SANS}}} .mono{{{MONO}}} .ph{{font-size:20px;fill:#f6d98a}}
  .float{{animation:float 4.5s ease-in-out infinite}} @keyframes float{{50%{{transform:translateY(-7px)}}}}
  .spin{{animation:spin 70s linear infinite}} @keyframes spin{{to{{transform:rotate(360deg)}}}}
  .ring{{transform-box:fill-box;transform-origin:center;animation:ring 3.8s ease-in-out infinite}} @keyframes ring{{0%,100%{{opacity:.5;transform:scale(1)}}50%{{opacity:.15;transform:scale(1.16)}}}}
  .sp{{animation:sp 6s linear infinite;opacity:0}} @keyframes sp{{0%{{opacity:0;transform:translate(0,0)}}15%{{opacity:.9}}100%{{opacity:0;transform:translate(var(--dx),-170px)}}}}
  .you{{animation:you 9s ease-in-out infinite alternate}} @keyframes you{{from{{transform:translateY(0)}}to{{transform:translateY(212px)}}}}
  .sweep{{animation:sweep 8s linear infinite}} @keyframes sweep{{from{{transform:translateY(-6px)}}to{{transform:translateY({H+6}px)}}}}
  {"".join(css)} {NOMOTION}
</style>
<g clip-path="url(#frame)">
  <rect width="{W}" height="{H}" fill="url(#bg)"/>
  <ellipse cx="170" cy="168" rx="330" ry="250" fill="url(#glow)"/>
  <rect width="{W}" height="{H}" fill="url(#scan)"/>
  <g transform="translate(170 168)"><g class="spin">{rays}</g></g>
  <circle class="ring" cx="170" cy="168" r="98" fill="none" stroke="#f2c14e" stroke-opacity=".35" stroke-width="1.5"/>
  <circle cx="170" cy="168" r="116" fill="none" stroke="#f2c14e" stroke-opacity=".12"/>
  <g>{sparks}</g>
  <g class="float"><g transform="translate(170 168) scale(4.5) translate(-16 -16)" filter="url(#cglow)"><path d="{CROSS}" fill="url(#gold)" stroke="#8a5a14" stroke-width=".5" stroke-linejoin="round"/></g></g>

  <rect class="sweep" width="{W}" height="2" fill="url(#acc)" opacity=".16"/>
  <text class="sans" x="304" y="100" font-size="12.5" font-weight="700" letter-spacing="4.5" fill="#c8a85a">A DAILY CHRISTIAN TRIVIA GAME</text>
  <rect x="304" y="114" width="56" height="3" rx="1.5" fill="url(#goldh)"/>
  <text class="sans" x="300" y="182" font-size="58" font-weight="800" fill="url(#gold)" textLength="496" lengthAdjust="spacingAndGlyphs">CROSSILLION</text>
  <text class="mono" x="300" y="{YT}" font-size="20" fill="#d99a2b" font-weight="700">&gt;</text>
  {"".join(texts)}{"".join(curs)}
  <text class="sans" x="304" y="276" font-size="12" letter-spacing="1" fill="#8b9bd8">Plain JavaScript  ·  synthesised chiptune music  ·  rarity from Wikipedia pageviews</text>

  <line x1="900" y1="38" x2="900" y2="304" stroke="#aac3ff" stroke-opacity=".7" stroke-width="2"/>
  {ticks}
  <g class="you"><g transform="translate(0 40)"><line x1="866" y1="0" x2="880" y2="0" stroke="#ff5a7a" stroke-width="2"/><path d="M880 -7 L897 0 L880 7 Z" fill="#ff5a7a"/><text style="{MONO}" x="832" y="4" font-size="11" font-weight="700" letter-spacing="1" fill="#ff5a7a">YOU</text></g></g>
  {band}
</g>
<rect x=".5" y=".5" width="{W-1}" height="{H-1}" rx="18" fill="none" stroke="#f2c14e" stroke-opacity=".3"/>
</svg>
'''
    save("hero.svg", svg)


# ------------------------------------------------------------------------------------------------ divider, play button, icons
def divider():
    save("divider.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 28" width="1000" height="28" role="presentation">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f2c14e" stop-opacity="0"/><stop offset=".5" stop-color="#f2c14e" stop-opacity=".9"/><stop offset="1" stop-color="#f2c14e" stop-opacity="0"/></linearGradient>
<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#c8872a"/></linearGradient></defs>
<style>.x{{animation:g 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}}@keyframes g{{0%,100%{{opacity:.75;transform:scale(1)}}50%{{opacity:1;transform:scale(1.18)}}}}{NOMOTION}</style>
<rect x="0" y="13" width="1000" height="2" fill="url(#g)"/>
<g class="x" transform="translate(500 14) scale(.62) translate(-16 -16)"><path d="{CROSS}" fill="url(#c)" stroke="#8a5a14" stroke-width=".6" stroke-linejoin="round"/></g>
</svg>
''')


def play_button():
    save("play-button.svg", f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 62" width="260" height="62" role="img" aria-label="Play Crossillion">
<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#f2c14e"/><stop offset="1" stop-color="#d99a2b"/></linearGradient>
<linearGradient id="sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="cp"><path d="M14 2H258V48L244 60H2V16z"/></clipPath></defs>
<style>.sh{{animation:sh 3.6s ease-in-out infinite}}@keyframes sh{{0%,55%{{transform:translateX(-120px)}}100%{{transform:translateX(320px)}}}}.ar{{animation:ar 1.4s ease-in-out infinite}}@keyframes ar{{50%{{transform:translateX(5px)}}}}{NOMOTION}</style>
<path d="M14 2H258V48L244 60H2V16z" fill="url(#b)" stroke="#8a5a14" stroke-opacity=".5"/>
<g clip-path="url(#cp)"><rect class="sh" x="0" y="0" width="70" height="62" fill="url(#sh)" transform="skewX(-20)"/></g>
<text x="128" y="39" text-anchor="middle" font-size="19" font-weight="800" letter-spacing="3" fill="#2a1b04" style="{SANS}">PLAY NOW</text>
<path class="ar" d="M205 22l12 9-12 9z" fill="#2a1b04"/>
</svg>
''')


ICONS = {
    "descent":  '<path d="M12 3v13M6 11l6 6 6-6M5 21h14"/>',
    "rarity":   '<path d="M4 21V11M10 21V4M16 21v-7M22 21H2"/>',
    "keyboard": '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    "music":    '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    "flame":    '<path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-.5-2-1-3 3 2 5 4 5 7a7 7 0 0 1-14 0c0-6 7-7 7-13z"/>',
    "book":     '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M8 7h7M8 11h5"/>',
    "layers":   '<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"/>',
    "database": '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    "calendar": '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    "image":    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5L5 20"/>',
    "code":     '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    "search":   '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    "wave":     '<path d="M2 12h3l2-6 4 12 3-9 2 3h6"/>',
    "play":     '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>',
    "rules":    '<path d="M4 7h16M4 12h10M4 17h6"/><circle cx="18" cy="15" r="3"/>',
    "wrench":   '<path d="M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-3 3-2.5-.5-.5-2.5z"/>',
    "heart":    '<path d="M12 20s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 5.7-8 11-8 11z"/>',
}


def icons():
    for name, body in ICONS.items():
        (OUT / "icons" / f"{name}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c8872a" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{body}</svg>\n',
            encoding="utf-8")
    print(f"  docs/images/icons/  {len(ICONS)} icons")


# ------------------------------------------------------------------------------------------------ tiers
def tiers():
    W, H = 1000, 430
    X, BW = 48, 904
    segs, prev = "", 0.0
    for i, t in enumerate(TIERS):
        share = t["cutoff"] - prev
        w = BW * share
        x = X + BW * prev
        segs += (f'<g class="seg" style="animation-delay:{0.15+i*0.12:.2f}s"><rect x="{x:.1f}" y="124" width="{max(w-3,2):.1f}" height="30" rx="6" fill="{t["color"]}"/>'
                 f'<text style="{SANS}" x="{x+w/2-1.5:.1f}" y="144" text-anchor="middle" font-size="12" font-weight="800" fill="#0b1020">{round(share*100)}%</text></g>')
        prev = t["cutoff"]
    notes = ["What the crowd says first", "Known, if you have been paying attention", "Solid church knowledge",
             "You have studied this", "A real deep cut", "Almost nobody says this"]
    rows = ""
    for i, t in enumerate(TIERS):
        y = 214 + i * 33
        rows += (f'<g class="fade" style="animation-delay:{0.5+i*0.1:.2f}s">'
                 f'<rect x="{X}" y="{y-14}" width="14" height="14" rx="4" fill="{t["color"]}"/>'
                 f'<text style="{SANS}" x="{X+28}" y="{y-2}" font-size="15" font-weight="800" fill="{t["color"]}">{escape(t["name"])}</text>'
                 f'<text style="{SANS}" x="{X+210}" y="{y-2}" font-size="13" fill="#c7cdf0">{notes[i]}</text>'
                 f'<rect x="690" y="{y-12}" width="160" height="9" rx="4.5" fill="#8aa4ff" fill-opacity=".1"/>'
                 f'<rect class="seg" style="animation-delay:{0.6+i*0.1:.2f}s" x="690" y="{y-12}" width="{160*t["meters"]/1000:.1f}" height="9" rx="4.5" fill="{t["color"]}"/>'
                 f'<text style="{MONO}" x="{X+BW}" y="{y-2}" text-anchor="end" font-size="14" font-weight="700" fill="#fff">+{t["meters"]:,} m</text></g>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="The six rarity tiers and the depth each one is worth">
<defs>{DEFS_BG}<clipPath id="frame"><rect width="{W}" height="{H}" rx="18"/></clipPath></defs>
<style>.seg{{transform-box:fill-box;transform-origin:left center;animation:grow 1s cubic-bezier(.2,.8,.2,1) both}}@keyframes grow{{from{{transform:scaleX(0)}}to{{transform:scaleX(1)}}}}.fade{{animation:fade .7s ease both}}@keyframes fade{{from{{opacity:0}}to{{opacity:1}}}}{NOMOTION}</style>
<g clip-path="url(#frame)"><rect width="{W}" height="{H}" fill="url(#bg)"/><rect width="{W}" height="{H}" fill="url(#scan)"/>
<text style="{SANS}" x="{X}" y="54" font-size="12.5" font-weight="700" letter-spacing="3" fill="#c8a85a">SIX RARITY TIERS</text>
<rect x="{X}" y="68" width="56" height="3" rx="1.5" fill="url(#goldh)"/>
<text style="{SANS}" x="{X}" y="98" font-size="14" fill="#c7cdf0">Every answer is ranked by how many people looked it up on Wikipedia. The rarer, the deeper it takes you.</text>
<text style="{SANS}" x="{X}" y="116" font-size="10.5" font-weight="700" letter-spacing="2" fill="#8b9bd8">SHARE OF A QUESTION'S ANSWERS IN EACH TIER (MOST COMMON FIRST)</text>
{segs}
<text style="{SANS}" x="{X}" y="186" font-size="10.5" font-weight="700" letter-spacing="2" fill="#8b9bd8">TIER</text>
<text style="{SANS}" x="{X+BW}" y="186" text-anchor="end" font-size="10.5" font-weight="700" letter-spacing="2" fill="#8b9bd8">DEPTH GAINED</text>
{rows}</g>
<rect x=".5" y=".5" width="{W-1}" height="{H-1}" rx="18" fill="none" stroke="#f2c14e" stroke-opacity=".3"/>
</svg>
'''
    save("tiers.svg", svg)


# ------------------------------------------------------------------------------------------------ zones
def zones():
    W, BH = 1000, 78
    H = 70 + BH * 5 + 28
    look = [("#3f9ae6", "#bfe3f7", "#0b1230", "#26407a"), ("#5b4331", "#2f1f17", "#f4efe2", "#d8b98f"),
            ("#262a47", "#12132a", "#f4efe2", "#aab3e6"), ("#2f2013", "#150d08", "#f4efe2", "#d9b27a"),
            ("#f2c14e", "#fff4c9", "#2a1b04", "#6b4a10")]
    defs, bands, labels = "", "", ""
    for i, z in enumerate(ZONES):
        c1, c2, tx, sub = look[i]
        y = 70 + i * BH
        defs += f'<linearGradient id="z{i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>'
        nxt = f'to {ZONES[i+1]["at"]:,} m' if i < 4 else "and below"
        labels += f'<text style="{MONO}" x="48" y="{y+BH/2+5}" font-size="15" font-weight="700" fill="#aac3ff">{z["at"]:,} m</text>'
        bands += (f'<rect x="170" y="{y}" width="782" height="{BH}" fill="url(#z{i})"/>'
                  f'<text style="{SANS}" x="196" y="{y+34}" font-size="21" font-weight="800" fill="{tx}">{escape(z["name"])}</text>'
                  f'<text style="{SANS}" x="196" y="{y+57}" font-size="13" font-style="italic" fill="{sub}">{escape(z["sub"])}</text>'
                  f'<text style="{MONO}" x="934" y="{y+BH/2+5}" text-anchor="end" font-size="12" font-weight="700" fill="{sub}">{nxt}</text>')
    ticks = "".join(f'<line x1="150" y1="{70+i*BH}" x2="164" y2="{70+i*BH}" stroke="#aac3ff" stroke-width="1.6"/>' for i in range(6))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="The five zones of the descent and the depth each begins at">
<defs>{DEFS_BG}{defs}<clipPath id="frame"><rect width="{W}" height="{H}" rx="18"/></clipPath>
<clipPath id="bandclip"><rect x="170" y="70" width="782" height="{BH*5}" rx="12"/></clipPath></defs>
<style>.you{{animation:you 11s cubic-bezier(.45,0,.2,1) infinite alternate}}@keyframes you{{from{{transform:translateY(0)}}to{{transform:translateY({BH*5-4}px)}}}}{NOMOTION}</style>
<g clip-path="url(#frame)"><rect width="{W}" height="{H}" fill="url(#bg)"/><rect width="{W}" height="{H}" fill="url(#scan)"/>
<text style="{SANS}" x="48" y="38" font-size="12.5" font-weight="700" letter-spacing="3" fill="#c8a85a">THE DESCENT, ZONE BY ZONE</text>
<rect x="48" y="50" width="56" height="3" rx="1.5" fill="url(#goldh)"/>
<g clip-path="url(#bandclip)">{bands}</g>{labels}
<line x1="150" y1="70" x2="150" y2="{70+BH*5}" stroke="#aac3ff" stroke-opacity=".7" stroke-width="2"/>{ticks}
<g class="you"><g transform="translate(0 72)"><path d="M126 -7 L143 0 L126 7 Z" fill="#ff5a7a"/><line x1="104" y1="0" x2="126" y2="0" stroke="#ff5a7a" stroke-width="2"/><text style="{MONO}" x="70" y="4" font-size="11" font-weight="700" letter-spacing="1" fill="#ff5a7a">YOU</text></g></g>
<text style="{SANS}" x="48" y="{H-14}" font-size="11" fill="#6f7bb0">A perfect game of seven top-tier answers reaches 7,000 m.</text></g>
<rect x=".5" y=".5" width="{W-1}" height="{H-1}" rx="18" fill="none" stroke="#f2c14e" stroke-opacity=".3"/>
</svg>
'''
    save("zones.svg", svg)


# ------------------------------------------------------------------------------------------------ pipeline
def pipeline():
    W, H = 1000, 262
    nodes = [("Your questions", "content/*.txt", '<path d="M8 6h14M8 12h14M8 18h9" stroke-linecap="round"/>'),
             ("Wikipedia", "12 months of pageviews", '<circle cx="15" cy="12" r="8"/><path d="M7 12h16M15 4c-3 3-3 13 0 16M15 4c3 3 3 13 0 16"/>'),
             ("Ranking", "inside each question", '<path d="M7 20V12M13 20V5M19 20v-5" stroke-linecap="round"/>'),
             ("data/answers.js", "built by tools/build.py", '<ellipse cx="15" cy="7" rx="7" ry="3"/><path d="M8 7v10c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/>'),
             ("The game", "tiers decided live", f'<g transform="translate(3 0) scale(.78)"><path d="{CROSS}"/></g>')]
    NW, GAP, X0, Y0, NH = 150, 38, 49, 66, 118
    out = ""
    for i, (a, b, glyph) in enumerate(nodes):
        x = X0 + i * (NW + GAP)
        out += (f'<g class="fade" style="animation-delay:{i*0.15:.2f}s"><rect x="{x}" y="{Y0}" width="{NW}" height="{NH}" rx="14" fill="#0e1138" stroke="#f2c14e" stroke-opacity=".45"/>'
                f'<g transform="translate({x+NW/2-15} {Y0+16})" fill="none" stroke="#f2c14e" stroke-width="1.8" stroke-linejoin="round">{glyph}</g>'
                f'<text style="{SANS}" x="{x+NW/2}" y="{Y0+72}" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">{escape(a)}</text>'
                f'<text style="{SANS}" x="{x+NW/2}" y="{Y0+92}" text-anchor="middle" font-size="11" fill="#aab3e6">{escape(b)}</text></g>')
        if i < len(nodes) - 1:
            ax = x + NW + 6
            out += (f'<line class="flow" x1="{ax}" y1="{Y0+NH/2}" x2="{ax+GAP-14}" y2="{Y0+NH/2}" stroke="#f2c14e" stroke-width="2" stroke-linecap="round"/>'
                    f'<path d="M{ax+GAP-14} {Y0+NH/2-5} l8 5 -8 5z" fill="#f2c14e"/>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="How rarity is worked out: questions, Wikipedia pageviews, ranking, generated data, the game">
<defs>{DEFS_BG}<clipPath id="frame"><rect width="{W}" height="{H}" rx="18"/></clipPath></defs>
<style>.flow{{stroke-dasharray:4 7;animation:flow 1.4s linear infinite}}@keyframes flow{{to{{stroke-dashoffset:-22}}}}.fade{{animation:fade .7s ease both}}@keyframes fade{{from{{opacity:0}}to{{opacity:1}}}}{NOMOTION}</style>
<g clip-path="url(#frame)"><rect width="{W}" height="{H}" fill="url(#bg)"/><rect width="{W}" height="{H}" fill="url(#scan)"/>
<text style="{SANS}" x="49" y="38" font-size="12.5" font-weight="700" letter-spacing="3" fill="#c8a85a">FROM A TEXT FILE TO A RARITY TIER</text>
{out}
<text style="{MONO}" x="{W/2}" y="228" text-anchor="middle" font-size="13" fill="#7dd3fc">python3 tools/build.py</text>
</g><rect x=".5" y=".5" width="{W-1}" height="{H-1}" rx="18" fill="none" stroke="#f2c14e" stroke-opacity=".3"/>
</svg>
'''
    save("pipeline.svg", svg)


if __name__ == "__main__":
    print("Writing README artwork:")
    hero(); divider(); play_button(); icons(); tiers(); zones(); pipeline()
