import json
import random
from datetime import datetime

PICKS_FILE = "giveaway-linux/data/picks.json"

with open(PICKS_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

catalog_software = data["catalog"]["software"]
catalog_games = data["catalog"]["games"]

new_software = random.choice(catalog_software)
new_game = random.choice(catalog_games)

today = datetime.now().strftime("%Y-%m-%d")

# Sauvegarder l'ancien pick dans l'historique
if "current" in data:
    old = {
        "date": data["current"]["date"],
        "software": {
            "name": data["current"]["software"]["name"],
            "category": data["current"]["software"]["category"],
            "homepage": data["current"]["software"]["homepage"],
            "download": data["current"]["software"]["download"]
        },
        "game": {
            "name": data["current"]["game"]["name"],
            "category": data["current"]["game"]["category"],
            "homepage": data["current"]["game"]["homepage"],
            "download": data["current"]["game"]["download"]
        }
    }
    data.setdefault("history", []).insert(0, old)

# Nouveau pick du jour
data["current"] = {
    "date": today,
    "software": new_software,
    "game": new_game,
    "note": "Sélection automatique quotidienne – Giveaway Linux"
}

with open(PICKS_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✅ Nouveau giveaway généré pour", today)