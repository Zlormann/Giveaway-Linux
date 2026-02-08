#!/usr/bin/env python3
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import email.utils

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

PICKS = DATA / "picks.json"
SOFTWARE = DATA / "software.json"
GAMES = DATA / "games.json"
OUT = ROOT / "rss.xml"

SITE = "https://zlormann.github.io/Giveaway-Linux/"
TITLE = "Giveaway Linux"
DESC = "1 logiciel + 1 jeu gratuits • sélection quotidienne (liens officiels)"

def load(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def find_by_id(items, _id):
    for it in items:
        if it.get("id") == _id:
            return it
    return None

def rfc2822_now_paris():
    paris = ZoneInfo("Europe/Paris")
    now = datetime.now(paris)
    return email.utils.format_datetime(now)

def xml_escape(s: str) -> str:
    return (s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;")
             .replace("'", "&apos;"))

def main():
    picks = load(PICKS)
    software = load(SOFTWARE)
    games = load(GAMES)

    sw = find_by_id(software, picks["software_id"])
    gm = find_by_id(games, picks["game_id"])

    if not sw or not gm:
        raise SystemExit("picks.json pointe vers un id absent dans software.json / games.json")

    date_str = picks["date"]
    page_link = SITE  # ou SITE + "index.html"

    item_title = f"{date_str} — {sw['name']} + {gm['name']}"
    item_desc = (
        f"Logiciel: {sw['name']} ({sw['url']}) • "
        f"Jeu: {gm['name']} ({gm['url']})"
    )

    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>{xml_escape(TITLE)}</title>
    <link>{xml_escape(SITE)}</link>
    <description>{xml_escape(DESC)}</description>
    <language>fr</language>
    <lastBuildDate>{xml_escape(rfc2822_now_paris())}</lastBuildDate>

    <item>
      <title>{xml_escape(item_title)}</title>
      <link>{xml_escape(page_link)}</link>
      <guid isPermaLink="false">{xml_escape("giveaway-linux-" + date_str)}</guid>
      <pubDate>{xml_escape(rfc2822_now_paris())}</pubDate>
      <description>{xml_escape(item_desc)}</description>
    </item>
  </channel>
</rss>
"""
    OUT.write_text(rss, encoding="utf-8")
    print("Updated rss.xml")

if __name__ == "__main__":
    main()