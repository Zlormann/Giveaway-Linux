// js/discover.js
"use strict";

const $ = (s) => document.querySelector(s);

const BASE = new URL("./", window.location.href);
const CATALOG_URL = new URL("data/catalog.json", BASE).toString();

// Favoris (simple) — compatible même si tu n’as pas l’étape 3
const LS_FAV = "gl_favorites_v1";

// Anti-répétition
const LS_RECENT = "gl_recent_random_v1";
const RECENT_KEEP = 20;

let CATALOG = { apps: [], games: [] };
let currentSoft = null;
let currentGame = null;

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeUrl(u) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) return "";
  return s;
}

function pickUrl(item) {
  const L = item?.links || {};
  return (
    safeUrl(L.download) ||
    safeUrl(L.official) ||
    safeUrl(L.flathub) ||
    safeUrl(L.steam) ||
    safeUrl(L.itch) ||
    ""
  );
}

function setError(msg) {
  const box = $("#errorBox");
  if (!box) return;
  box.innerHTML = msg ? `<div class="danger">❌ ${esc(msg)}</div>` : "";
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLS(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

/* ===== Favoris ===== */
function favGet() {
  const arr = loadLS(LS_FAV, []);
  return Array.isArray(arr) ? arr : [];
}

function favAdd(kind, item) {
  if (!item?.id) return;
  const favs = favGet();
  const entry = {
    kind, // "software" | "game"
    id: item.id,
    title: item.title || item.name || "—",
    url: pickUrl(item),
    ts: Date.now()
  };
  const next = [
    entry,
    ...favs.filter(x => !(x && x.kind === kind && x.id === item.id))
  ].slice(0, 200);
  saveLS(LS_FAV, next);
}

/* ===== Anti-répétition ===== */
function recentGet() {
  const r = loadLS(LS_RECENT, { softwares: [], games: [] });
  if (!r || typeof r !== "object") return { softwares: [], games: [] };
  return {
    softwares: Array.isArray(r.softwares) ? r.softwares : [],
    games: Array.isArray(r.games) ? r.games : []
  };
}

function recentPush(kind, id) {
  const r = recentGet();
  const key = kind === "software" ? "softwares" : "games";
  const next = [id, ...r[key].filter(x => x !== id)].slice(0, RECENT_KEEP);
  r[key] = next;
  saveLS(LS_RECENT, r);
}

function resetRecent() {
  saveLS(LS_RECENT, { softwares: [], games: [] });
}

/* ===== UI helpers ===== */
function setTags(container, tags) {
  container.innerHTML = "";
  (tags || []).slice(0, 10).forEach(t => {
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = t;
    container.appendChild(s);
  });
}

function addLink(container, label, url) {
  const u = safeUrl(url);
  if (!u) return;
  const a = document.createElement("a");
  a.className = "link";
  a.href = u;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = label;
  container.appendChild(a);
}

function renderSoftware(item) {
  const title = $("#softTitle");
  const desc = $("#softDesc");
  const tags = $("#softTags");
  const links = $("#softLinks");

  if (!title || !desc || !tags || !links) return;

  if (!item) {
    title.textContent = "—";
    desc.textContent = "—";
    tags.innerHTML = "";
    links.innerHTML = "";
    return;
  }

  title.textContent = item.title || item.name || "—";
  desc.textContent = item.shortDesc || item.desc || "";
  setTags(tags, item.tags);

  links.innerHTML = "";
  addLink(links, "⬇ Télécharger logiciel", pickUrl(item));
  addLink(links, "Site officiel", item.links?.official);
  addLink(links, "Flathub", item.links?.flathub);
}

function renderGame(item) {
  const title = $("#gameTitle");
  const desc = $("#gameDesc");
  const tags = $("#gameTags");
  const links = $("#gameLinks");

  if (!title || !desc || !tags || !links) return;

  if (!item) {
    title.textContent = "—";
    desc.textContent = "—";
    tags.innerHTML = "";
    links.innerHTML = "";
    return;
  }

  title.textContent = item.title || item.name || "—";
  desc.textContent = item.shortDesc || item.desc || "";
  setTags(tags, item.tags);

  links.innerHTML = "";
  addLink(links, "⬇ Télécharger jeu", pickUrl(item));
  addLink(links, "Site officiel", item.links?.official);
  addLink(links, "Flathub", item.links?.flathub);
  addLink(links, "Steam", item.links?.steam);
  addLink(links, "itch.io", item.links?.itch);
}

/* ===== Random pick ===== */
function randomPick(list, avoidSet) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const clean = list.filter(x => x && x.id);

  const pool = avoidSet
    ? (clean.filter(x => !avoidSet.has(x.id)).length ? clean.filter(x => !avoidSet.has(x.id)) : clean)
    : clean;

  return pool[Math.floor(Math.random() * pool.length)] || null;
}

/* ===== URL share ===== */
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function setShareUrl(soft, game) {
  const u = new URL(window.location.href);
  u.searchParams.delete("s");
  u.searchParams.delete("g");
  u.searchParams.delete("d");

  if (soft?.id) u.searchParams.set("s", soft.id);
  if (game?.id) u.searchParams.set("g", game.id);

  // d optionnel → utile pour SEO + historique “partage”
  u.searchParams.set("d", todayISO());

  window.history.replaceState({}, "", u.toString());
  return u.toString();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  }
}

/* ===== Query params (si lien partagé) ===== */
function applyFromQuery() {
  const p = new URLSearchParams(window.location.search);
  const s = (p.get("s") || "").trim();
  const g = (p.get("g") || "").trim();

  const soft = s ? CATALOG.apps.find(x => x?.id === s) : null;
  const game = g ? CATALOG.games.find(x => x?.id === g) : null;

  if (soft || game) {
    currentSoft = soft;
    currentGame = game;
    renderSoftware(currentSoft);
    renderGame(currentGame);
    // si un seul est présent, on peut tirer l’autre automatiquement
    if (soft && !game) {
      currentGame = randomPick(CATALOG.games, null);
      renderGame(currentGame);
    }
    if (!soft && game) {
      currentSoft = randomPick(CATALOG.apps, null);
      renderSoftware(currentSoft);
    }
    setShareUrl(currentSoft, currentGame);
    return true;
  }
  return false;
}

/* ===== Roll logic ===== */
function roll() {
  setError("");

  const mode = $("#mode")?.value || "both";
  const avoid = ($("#avoid")?.value || "on") === "on";

  const recent = recentGet();
  const avoidSoft = avoid ? new Set(recent.softwares) : null;
  const avoidGame = avoid ? new Set(recent.games) : null;

  if (mode === "software" || mode === "both") {
    currentSoft = randomPick(CATALOG.apps, avoidSoft);
    renderSoftware(currentSoft);
    if (currentSoft?.id) recentPush("software", currentSoft.id);
  } else {
    currentSoft = null;
    renderSoftware(null);
  }

  if (mode === "game" || mode === "both") {
    currentGame = randomPick(CATALOG.games, avoidGame);
    renderGame(currentGame);
    if (currentGame?.id) recentPush("game", currentGame.id);
  } else {
    currentGame = null;
    renderGame(null);
  }

  setShareUrl(currentSoft, currentGame);
}

/* ===== Init ===== */
(async function init() {
  try {
    setError("");

    const res = await fetch(CATALOG_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Erreur chargement catalog.json (HTTP ${res.status})`);
    const data = await res.json();

    if (!data || typeof data !== "object") throw new Error("catalog.json invalide");
    if (!Array.isArray(data.apps) || !Array.isArray(data.games)) {
      throw new Error("catalog.json doit contenir apps[] et games[]");
    }

    CATALOG = {
      apps: data.apps.filter(x => x && x.id),
      games: data.games.filter(x => x && x.id)
    };

    if (CATALOG.apps.length === 0 || CATALOG.games.length === 0) {
      throw new Error("catalog.json vide : ajoute au moins 1 logiciel et 1 jeu.");
    }

    // Si lien partagé, on l’applique, sinon roll auto
    const usedQuery = applyFromQuery();
    if (!usedQuery) roll();

    $("#roll")?.addEventListener("click", roll);

    $("#share")?.addEventListener("click", async () => {
      const link = setShareUrl(currentSoft, currentGame);
      await copyToClipboard(link);
      alert("Lien copié ✅");
    });

    $("#reset")?.addEventListener("click", () => {
      resetRecent();
      alert("Anti-répétition réinitialisée ✅");
    });

    $("#favSoftware")?.addEventListener("click", () => {
      if (!currentSoft) return alert("Aucun logiciel sélectionné.");
      favAdd("software", currentSoft);
      alert("Logiciel ajouté aux favoris ⭐");
    });

    $("#favGame")?.addEventListener("click", () => {
      if (!currentGame) return alert("Aucun jeu sélectionné.");
      favAdd("game", currentGame);
      alert("Jeu ajouté aux favoris ⭐");
    });

  } catch (err) {
    console.error(err);
    setError(err?.message || String(err));
  }
})();
