#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

REQUIRED_LISTS = {
    "software.json": ["id", "name", "url"],
    "games.json": ["id", "name", "url"],
}

def load(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def validate_list(filename: str, required_keys):
    path = DATA / filename
    data = load(path)
    if not isinstance(data, list):
        raise SystemExit(f"❌ {filename}: must be a JSON list.")

    ids = set()
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise SystemExit(f"❌ {filename}[{i}]: must be an object.")
        for k in required_keys:
            if k not in item or not isinstance(item[k], str) or not item[k].strip():
                raise SystemExit(f"❌ {filename}[{i}]: missing/invalid '{k}'.")
        if not item["url"].startswith("http"):
            raise SystemExit(f"❌ {filename}[{i}]: url must start with http.")
        if item["id"] in ids:
            raise SystemExit(f"❌ {filename}: duplicate id '{item['id']}'.")
        ids.add(item["id"])

    print(f"✅ {filename}: OK ({len(data)} items)")

def validate_picks():
    path = DATA / "picks.json"
    data = load(path)
    if not isinstance(data, dict):
        raise SystemExit("❌ picks.json: must be an object.")

    for k in ["date", "software_id", "game_id"]:
        if k not in data or not isinstance(data[k], str) or not data[k].strip():
            raise SystemExit(f"❌ picks.json: missing/invalid '{k}'.")

    software_ids = {x["id"] for x in load(DATA / "software.json")}
    game_ids = {x["id"] for x in load(DATA / "games.json")}

    if data["software_id"] not in software_ids:
        raise SystemExit(f"❌ picks.json: software_id '{data['software_id']}' not found in software.json")
    if data["game_id"] not in game_ids:
        raise SystemExit(f"❌ picks.json: game_id '{data['game_id']}' not found in games.json")

    print("✅ picks.json: OK")

def main():
    # Vérifie que tous les JSON se parsèrent
    for p in DATA.glob("*.json"):
        try:
            load(p)
        except Exception as e:
            raise SystemExit(f"❌ Invalid JSON in {p.name}: {e}")

    for fname, keys in REQUIRED_LISTS.items():
        validate_list(fname, keys)

    validate_picks()
    print("✅ All validations passed.")

if __name__ == "__main__":
    main()