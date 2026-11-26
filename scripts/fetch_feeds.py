#!/usr/bin/env python3
"""Pick this week's reading for B1–C2: 6 articles per level with a mix of topics.

Run by .github/workflows/feeds.yml every Monday. Writes fr.json and fa.json, published on the
`feeds` branch, which the app reads from raw.githubusercontent.com (a website can't read these
RSS feeds itself because the news sites don't allow cross-site requests). A1 and A2 use short
texts written for the app instead (data/reading.js).
Usage: python3 scripts/fetch_feeds.py OUT_DIR
"""
import html, json, os, re, sys, time, urllib.request
import xml.etree.ElementTree as ET

PER_LEVEL = 6
TOPICS = ["culture", "entertainment", "sport", "science", "world", "society"]

# level → list of (source, url, topic or None to guess from keywords). Easier sources for lower levels.
FEEDS = {
    "fr": {
        "B1": [("1jour1actu", "https://www.1jour1actu.com/feed", None),
               ("franceinfo", "https://www.francetvinfo.fr/titres.rss", None)],
        "B2": [("franceinfo", "https://www.francetvinfo.fr/culture.rss", "culture"),
               ("franceinfo", "https://www.francetvinfo.fr/sports.rss", "sport"),
               ("franceinfo", "https://www.francetvinfo.fr/sciences.rss", "science"),
               ("franceinfo", "https://www.francetvinfo.fr/monde.rss", "world"),
               ("franceinfo", "https://www.francetvinfo.fr/societe.rss", "society"),
               ("France 24", "https://www.france24.com/fr/culture/rss", "entertainment")],
        "C1": [("Le Monde", "https://www.lemonde.fr/culture/rss_full.xml", "culture"),
               ("Le Monde", "https://www.lemonde.fr/sport/rss_full.xml", "sport"),
               ("Le Monde", "https://www.lemonde.fr/sciences/rss_full.xml", "science"),
               ("Le Monde", "https://www.lemonde.fr/international/rss_full.xml", "world"),
               ("Le Monde", "https://www.lemonde.fr/societe/rss_full.xml", "society"),
               ("Le Monde", "https://www.lemonde.fr/cinema/rss_full.xml", "entertainment")],
        "C2": [("Le Monde", "https://www.lemonde.fr/idees/rss_full.xml", "society"),
               ("Le Monde", "https://www.lemonde.fr/livres/rss_full.xml", "culture"),
               ("Le Monde", "https://www.lemonde.fr/planete/rss_full.xml", "science"),
               ("RFI", "https://www.rfi.fr/fr/rss", None)],
    },
    "fa": {
        "B1": [("DW فارسی", "https://rss.dw.com/rdf/rss-per-all", None)],
        "B2": [("BBC فارسی", "https://feeds.bbci.co.uk/persian/rss.xml", None)],
        "C1": [("RFI فارسی", "https://www.rfi.fr/fa/rss", None), ("BBC فارسی", "https://feeds.bbci.co.uk/persian/rss.xml", None)],
        "C2": [("BBC فارسی", "https://feeds.bbci.co.uk/persian/rss.xml", None), ("DW فارسی", "https://rss.dw.com/rdf/rss-per-all", None)],
    },
}
KEYWORDS = {
    "sport": r"sport|foot|match|olymp|tennis|cricket|rugby|cycl|champion|coupe|ورزش|فوتبال|المپیک|جام|تیم ملی|کشتی|والیبال|بازیکن",
    "science": r"scien|espace|planète|climat|santé|médec|recherche|découv|astron|virus|علم|دانشمند|فضا|پژوهش|سلامت|اقلیم|پزشک|ناسا",
    "culture": r"cultur|livre|musée|exposition|art|patrimoine|littéra|فرهنگ|کتاب|هنر|موزه|ادبیات|شعر|نقاشی",
    "entertainment": r"film|cinéma|série|musique|concert|chanteu|festival|télé|فیلم|سینما|موسیقی|کنسرت|خواننده|جشنواره|سریال",
    "world": r"monde|international|guerre|élection|président|europe|amérique|جنگ|انتخابات|جهان|آمریکا|اروپا|سازمان ملل",
}


def _text(el, *names):
    for child in el:
        if child.tag.rsplit("}", 1)[-1] in names and (child.text or "").strip():
            return child.text.strip()
    return ""


def _clean(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def guess(text):
    for topic, pat in KEYWORDS.items():
        if re.search(pat, text, re.I):
            return topic
    return "society"


def fetch(source, url, topic):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (weekly reading list)"})
        root = ET.fromstring(urllib.request.urlopen(req, timeout=25).read())
    except Exception as e:  # one dead feed must not break the rest
        print("feed error", url, e, file=sys.stderr)
        return []
    out = []
    for el in root.iter():
        if el.tag.rsplit("}", 1)[-1] not in ("item", "entry"):
            continue
        title = _clean(_text(el, "title"))
        link = _text(el, "link")
        if not link:
            for c in el:
                if c.tag.rsplit("}", 1)[-1] == "link" and c.get("href"):
                    link = c.get("href")
        summary = _clean(_text(el, "description", "summary"))[:700]
        if not title or not link.startswith("http") or len(summary) < 40:
            continue
        cats = " ".join((c.text or "") for c in el if c.tag.rsplit("}", 1)[-1] == "category")
        out.append({"source": source, "title": title, "link": link, "summary": summary,
                    "date": _text(el, "pubDate", "date", "updated", "published"),
                    "topic": topic or guess(cats + " " + title + " " + summary)})
        if len(out) >= 25:
            break
    return out


def choose(items, used):
    """6 articles, one per topic first, then the newest of the rest; no repeats across levels."""
    items = [i for i in items if i["link"] not in used]
    picked = []
    for t in TOPICS:
        for i in items:
            if i["topic"] == t and i not in picked:
                picked.append(i)
                break
    for i in items:
        if len(picked) >= PER_LEVEL:
            break
        if i not in picked:
            picked.append(i)
    picked = picked[:PER_LEVEL]
    used.update(i["link"] for i in picked)
    return picked


if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out_dir, exist_ok=True)
    total = 0
    for lang, levels in FEEDS.items():
        used, res = set(), {}
        for lvl, feeds in levels.items():
            items = []
            for f in feeds:
                items += fetch(*f)
            res[lvl] = choose(items, used)
            total += len(res[lvl])
            print(lang, lvl, len(res[lvl]), "articles:", ", ".join(i["topic"] for i in res[lvl]))
        week = time.strftime("%G-W%V")
        with open(os.path.join(out_dir, lang + ".json"), "w", encoding="utf-8") as f:
            json.dump({"updated": int(time.time()), "week": week, "levels": res}, f, ensure_ascii=False)
    if total == 0:
        sys.exit("no articles fetched")
