#!/usr/bin/env python3
# build_giveaway_linux_full.py
# Génère un site statique "Giveaway Linux" + automation GitHub Actions

from __future__ import annotations
from pathlib import Path
import json

def read_json(path: Path, default):
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return default

def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def update_history(data_dir: Path, pick: dict, keep_days: int = 30):
    """
    Met à jour data/history.json avec la sélection du jour (30 jours).
    - dédoublonne par date
    - trie du plus récent au plus ancien
    - garde keep_days entrées
    """
    history_path = data_dir / "history.json"
    history = read_json(history_path, default=[])
    if not isinstance(history, list):
        history = []

    entry = {
        "date": pick.get("date"),
        "software_id": pick.get("software_id"),
        "game_id": pick.get("game_id"),
        "generated_utc": pick.get("generated_utc"),
        "site": pick.get("site"),
    }

    # supprime même date
    history = [e for e in history if isinstance(e, dict) and e.get("date") != entry["date"]]
    history.insert(0, entry)
    history.sort(key=lambda e: e.get("date", ""), reverse=True)
    history = history[:keep_days]

    write_json(history_path, history)

ROOT = Path("giveaway-linux")