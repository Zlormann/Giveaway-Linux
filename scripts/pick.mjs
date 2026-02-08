import fs from "node:fs";

function loadJson(p){ return JSON.parse(fs.readFileSync(p, "utf8")); }
function saveJson(p, obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8"); }
function todayISO(){
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,"0");
  const da = String(d.getUTCDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}
function pickRandom(items, usedSet){
  const available = items.filter(x => !usedSet.has(x.id));
  const pool = available.length ? available : items; // si tout est utilisé → on repart
  return pool[Math.floor(Math.random()*pool.length)];
}
function toIssue(n){ return String(n).padStart(4, "0"); }

const catalogPath = "data/catalog.json";
const picksPath = "data/picks.json";

const catalog = loadJson(catalogPath);
const picks = loadJson(picksPath);

const today = todayISO();

// anti double-run (si workflow lancé 2 fois)
if (picks.current?.date === today) {
  console.log("Déjà sélectionné aujourd’hui, sortie.");
  process.exit(0);
}

const usedApps = new Set((picks.history || []).map(h => h.app?.id).filter(Boolean));
const usedGames = new Set((picks.history || []).map(h => h.game?.id).filter(Boolean));

const app = pickRandom(catalog.apps, usedApps);
const game = pickRandom(catalog.games, usedGames);

const nextIssueNum = (picks.issueCounter || 1);
const issue = toIssue(nextIssueNum);

const entry = { issue, date: today, app, game };

// archive l'ancien current si présent
if (picks.current && picks.current.date) {
  picks.history = picks.history || [];
  picks.history.unshift(picks.current);
  // garde une archive raisonnable (ex: 365)
  picks.history = picks.history.slice(0, 365);
}

picks.current = entry;
picks.issueCounter = nextIssueNum + 1;

saveJson(picksPath, picks);
console.log("OK:", entry);
