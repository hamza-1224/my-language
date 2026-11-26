#!/usr/bin/env python3
"""Fetch the French and Persian news feeds the Read tab shows and write them as JSON.

Run by .github/workflows/feeds.yml every few hours; the result is published on the
`feeds` branch, which the app reads from raw.githubusercontent.com (a website can't read
these RSS feeds itself because the news sites don't allow cross-site requests).
Usage: python3 scripts/fetch_feeds.py OUT_DIR
"""
import html, json, os, re, sys, time, urllib.request
import xml.etree.ElementTree as ET

FEEDS = {
    "fr": [
        ("RFI", "https://www.rfi.fr/fr/rss"),
        ("France 24", "https://www.france24.com/fr/rss"),
        ("Le Monde", "https://www.lemonde.fr/rss/une.xml"),
        ("franceinfo", "https://www.francetvinfo.fr/titres.rss"),
    ],
    "fa": [
        ("BBC فارسی", "https://feeds.bbci.co.uk/persian/rss.xml"),
        ("DW فارسی", "https://rss.dw.com/rdf/rss-per-all"),
        ("RFI فارسی", "https://www.rfi.fr/fa/rss"),
    ],
}


def _text(el, *names):
    for child in el:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag in names and (child.text or "").strip():
            return child.text.strip()
    return ""


def _clean(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def fetch(lang):
    items = []
    for source, url in FEEDS[lang]:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (feed reader)"})
            root = ET.fromstring(urllib.request.urlopen(req, timeout=20).read())
            n = 0
            for el in root.iter():
                if el.tag.rsplit("}", 1)[-1] not in ("item", "entry"):
                    continue
                title = _clean(_text(el, "title"))
                link = _text(el, "link")
                if not link:
                    for c in el:
                        if c.tag.rsplit("}", 1)[-1] == "link" and c.get("href"):
                            link = c.get("href")
                if not title or not link.startswith("http"):
                    continue
                items.append({"source": source, "title": title, "link": link,
                              "summary": _clean(_text(el, "description", "summary"))[:600],
                              "date": _text(el, "pubDate", "date", "updated", "published")})
                n += 1
                if n >= 12:
                    break
        except Exception as e:  # one dead feed must not break the rest
            print("feed error", url, e, file=sys.stderr)
    by = {}
    for it in items:
        by.setdefault(it["source"], []).append(it)
    out = []
    while any(by.values()):  # interleave sources so the list is varied
        for s in list(by):
            if by[s]:
                out.append(by[s].pop(0))
    return out


if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out_dir, exist_ok=True)
    total = 0
    for lang in FEEDS:
        items = fetch(lang)
        total += len(items)
        with open(os.path.join(out_dir, lang + ".json"), "w", encoding="utf-8") as f:
            json.dump({"updated": int(time.time()), "items": items}, f, ensure_ascii=False)
        print(lang, len(items), "articles")
    if total == 0:
        sys.exit("no articles fetched")
