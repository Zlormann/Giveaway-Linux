#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
from datetime import datetime, timezone
from email.utils import format_datetime
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CATALOG = os.path.join(ROOT, "data", "catalog.json")   # historique
PICKS   = os.path.join(ROOT, "data", "picks.json")     # fallback si pas de catalog
SOFT    = os.path.join(ROOT, "data", "software.json")
GAMES   = os.path.join(ROOT, "data", "games.json")
OUT     = os.path.join(ROOT, "rss.xml")

SITE_URL = "https://zlormann.github.io/Giveaway-Linux/"
FEED_URL = SITE_URL + "rss.xml"
FEED_TITLE = "Giveaway Linux"
FEED_DESC = "Daily free Linux software & games"
LANG = "fr"
MAX_ITEMS = 30


def load_json(path):
  with open(path, "r", encoding="utf-8") as f:
    return json.load(f)


def safe(s):
  return escape(str(s or ""))


def to_rfc822(dt: datetime) -> str:
  return format_datetime(dt.astimezone(timezone.utc))


def parse_dt(value: str | None) -> datetime:
  if not value:
    return datetime.now(timezone.utc)
  try:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt.astimezone(timezone.utc)
  except Exception:
    return datetime.now(timezone.utc)


def pick_url(obj: dict | None) -> str:
  if not isinstance(obj, dict):
    return SITE_URL
  return obj.get("download_url") or obj.get("home_url") or obj.get("url") or SITE_URL


def main():
  software_list = load_json(SOFT)
  games_list = load_json(GAMES)

  # Lire l'historique
  if os.path.exists(CATALOG):
    catalog = load_json(CATALOG)
    if not isinstance(catalog, list):
      raise ValueError("catalog.json doit être un tableau JSON []")
  else:
    # fallback : 1 seul item depuis picks.json
    pick = load_json(PICKS)
    catalog = [pick]

  # Trier par date desc (ou generated_utc)
  def sort_key(x):
    d = x.get("generated_utc") or (x.get("date", "") + "T00:00:00+00:00")
    return parse_dt(d)

  catalog = sorted(catalog, key=sort_key, reverse=True)[:MAX_ITEMS]

  # Map id -> objet
  soft_by_id = {s.get("id"): s for s in software_list if isinstance(s, dict)}
  games_by_id = {g.get("id"): g for g in games_list if isinstance(g, dict)}

  items_xml = []
  last_build_dt = datetime.now(timezone.utc)

  for pick in catalog:
    date = pick.get("date") or "today"
    dt = parse_dt(pick.get("generated_utc"))
    if dt > last_build_dt:
      last_build_dt = dt

    software = soft_by_id.get(pick.get("software_id"))
    game = games_by_id.get(pick.get("game_id"))

    soft_name = (software or {}).get("name", "Logiciel")
    game_name = (game or {}).get("name", "Jeu")

    soft_page = (software or {}).get("url") or SITE_URL
    game_page = (game or {}).get("url") or SITE_URL

    soft_dl = pick_url(software)
    game_dl = pick_url(game)

    item_title = f"{soft_name} + {game_name} ({date})"
    item_link = f"{SITE_URL}#${date}"
    item_guid = f"{SITE_URL}#{date}"
    pub_date = to_rfc822(dt)

    desc_cdata = (
      f"<b>Logiciel :</b> {safe(soft_name)}<br/>"
      f"Page officielle : <a href=\"{safe(soft_page)}\">{safe(soft_page)}</a><br/>"
      f"Télécharger : <a href=\"{safe(soft_dl)}\">{safe(soft_dl)}</a><br/><br/>"
      f"<b>Jeu :</b> {safe(game_name)}<br/>"
      f"Page officielle : <a href=\"{safe(game_page)}\">{safe(game_page)}</a><br/>"
      f"Télécharger : <a href=\"{safe(game_dl)}\">{safe(game_dl)}</a>"
    )

    items_xml.append(f"""
    <item>
      <title>{safe(item_title)}</title>
      <link>{safe(item_link)}</link>
      <guid isPermaLink="false">{safe(item_guid)}</guid>
      <pubDate>{safe(pub_date)}</pubDate>
      <description><![CDATA[{desc_cdata}]]></description>
    </item>
    """.rstrip())

  last_build = to_rfc822(last_build_dt)

  rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{safe(FEED_TITLE)}</title>
    <link>{safe(SITE_URL)}</link>
    <atom:link href="{safe(FEED_URL)}" rel="self" type="application/rss+xml" />
    <description>{safe(FEED_DESC)}</description>
    <language>{safe(LANG)}</language>
    <lastBuildDate>{safe(last_build)}</lastBuildDate>
{chr(10).join(items_xml)}
  </channel>
</rss>
"""
  with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    f.write(rss)

  print("✅ rss.xml généré :", OUT)


if __name__ == "__main__":
  main()