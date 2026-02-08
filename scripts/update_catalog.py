#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

PICKS = DATA / "picks.json"
CATALOG = DATA / "catalog.json"

MAX_DAYS = 30

def load_json(path: Path, default):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def parse_dt(p):
    # ordre par date (ou generated_utc)
    if isinstance(p, dict) and p.get("generated_utc"):
        try:
            return datetime.fromisoformat(p["generated_utc"].replace("Z", "+00:00")).astimezone(timezone.utc)
        except Exception:
            pass
    if isinstance(p, dict) and p.get("date"):
        try:
            return datetime.fromisoformat(p["date"] + "T00:00:00+00:00").astimezone(timezone.utc)
        except Exception:
            pass
    return datetime(1970, 1, 1, tzinfo=timezone.utc)

def normalize_pick(p):
    # on garde un format simple et stable
    return {
        "date": p.get("date"),
        "software_id": p.get("software_id"),
        "game_id": p.get("game_id"),
        "generated_utc": p.get("generated_utc") or datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    }

def main():
    pick = load_json(PICKS, None)
    if not isinstance(pick, dict):
        raise SystemExit("❌ data/picks.json invalide (doit être un objet JSON).")

    if not pick.get("date") or not pick.get("software_id") or not pick.get("game_id"):
        raise SystemExit("❌ picks.json doit contenir: date, software_id, game_id")

    catalog = load_json(CATALOG, [])
    if not isinstance(catalog, list):
        catalog = []

    new_item = normalize_pick(pick)

    # clé unique
    new_key = f"{new_item['date']}__{new_item['software_id']}__{new_item['game_id']}"

    # enlever doublons (même jour+ids)
    def key_of(x):
        if not isinstance(x, dict):
            return ""
        return f"{x.get('date')}__{x.get('software_id')}__{x.get('game_id')}"

    catalog = [x for x in catalog if key_of(x) != new_key]

    # ajouter au début
    catalog.insert(0, new_item)

    # trier et garder MAX_DAYS
    catalog = sorted(catalog, key=parse_dt, reverse=True)[:MAX_DAYS]

    save_json(CATALOG, catalog)
    print(f"✅ catalog.json mis à jour ({len(catalog)} items).")

if __name__ == "__main__":
    main()