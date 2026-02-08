#!/usr/bin/env python3
import json, random, hashlib
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PICKS = DATA / "picks.json"
SOFTWARE = DATA / "software.json"
GAMES = DATA / "games.json"

SITE_URL = "https://zlormann.github.io/Giveaway-Linux/"

def load_list(path: Path):
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{path} must be a JSON list.")
    return data

def validate_items(items, kind: str):
    ids = set()
    for i, it in enumerate(items):
        if not isinstance(it, dict):
            raise ValueError(f"{kind}[{i}] must be an object.")
        if "id" not in it or not isinstance(it["id"], str) or not it["id"].strip():
            raise ValueError(f"{kind}[{i}] missing valid 'id'.")
        if "name" not in it or not isinstance(it["name"], str) or not it["name"].strip():
            raise ValueError(f"{kind}[{i}] missing valid 'name'.")
        if "url" not in it or not isinstance(it["url"], str) or not it["url"].startswith("http"):
            raise ValueError(f"{kind}[{i}] missing valid 'url' (must start with http).")
        if it["id"] in ids:
            raise ValueError(f"Duplicate id '{it['id']}' in {kind}.")
        ids.add(it["id"])

def stable_daily_seed(date_str: str) -> int:
    # Seed stable par jour => même résultat si relancé le même jour
    h = hashlib.sha256(date_str.encode("utf-8")).hexdigest()
    return int(h[:16], 16)

def main():
    paris = ZoneInfo("Europe/Paris")
    now_paris = datetime.now(paris)

    # On n'exécute la sélection que si on est à 13:30 (heure de Paris)
    if not (now_paris.hour == 13 and now_paris.minute == 30):
        print(f"Skip: now in Paris is {now_paris:%H:%M}, not 13:30.")
        return

    date_str = now_paris.strftime("%Y-%m-%d")
    software = load_list(SOFTWARE)
    games = load_list(GAMES)

    validate_items(software, "software")
    validate_items(games, "games")

    rnd = random.Random(stable_daily_seed(date_str))
    sw = rnd.choice(software)
    gm = rnd.choice(games)

    payload = {
        "date": date_str,
        "software_id": sw["id"],
        "game_id": gm["id"],
        "generated_utc": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "site": SITE_URL
    }

    DATA.mkdir(parents=True, exist_ok=True)
    with PICKS.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print("Updated data/picks.json:", payload)

if __name__ == "__main__":
    main()