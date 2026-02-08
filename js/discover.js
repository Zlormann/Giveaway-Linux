// js/discover.js
"use strict";

const $ = (s) => document.querySelector(s);

const BASE = new URL("./", window.location.href);
const CATALOG_URL = new URL("data/catalog.json", BASE).toString();

const LS_KEY_FAV = "gl_favorites_v1";
const LS_KEY_RECENT = "gl_recent_random_v1"; // évite répétitions
const RECENT_KEEP = 20; // nombre de tirages mémorisés

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

function pickUrl(obj) {
  const L = obj?.links || obj || {};
  return (
    safeUrl(L.download) ||
    safeUrl(L.official) ||
    safeUrl(L.flathub) ||
    safeUrl(L.steam) ||
    safeUrl(L.itch) ||
    ""
  );
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

function setTags(container, tags) {
  container.innerHTML = "";
  (tags || []).slice(0, 10).forEach((t) => {
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = t;
    container.appendChild(s);
  });
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
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function favoritesGet() {
  const f = loadLS(LS_KEY_FAV, []);
  return Array.isArray(f) ? f : [];
}

function favoritesAdd(item, kind) {
  // kind: "software" | "game"
  if (!item?.id) return;
  const favs = favoritesGet();
  const entry = {
    kind,
    id: item.id,
    title: item.title || item.name || "—",
    url: pickUrl(item),
    ts: Date.now(),
  };
  const next = [
    entry,
    ...favs.filter((x) => !(x && x.kind === kind && x.id === item.id)),
  ].slice(0, 200);
  saveLS(LS_KEY_FAV, next);
}

function recentGet() {
  const r = loadLS(LS_KEY_RECENT, { softwares: [], games: [] });
  return r && typeof r === "object" ? r : { softwares: [], games: [] };
}

function recentPush(kind, id) {
  const r = recentGet();
  const key = kind === "software" ? "softwares" : "games";
  const arr = Array.isArray(r[key]) ? r[key] : [];
  const next = [id, ...arr.filter((x) => x !== id)].slice(0, RECENT_KEEP);
  r[key] = next;
  saveLS(LS_KEY_RECENT, r);
}

function resetAll() {
  saveLS(LS_KEY_RECENT, { softwares: [], games: [] });
  // on ne wipe pas les favoris par défaut (mais tu peux si tu veux)
  // saveLS(LS_KEY_FAV, []);
}

async function loadCatalog() {
  const res = await fetch(CATALOG_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur data/catalog.json`);
  const data = await res.json();

  // Validation légère (sécurité anti JSON cassé)
  if (!data || typeof data !== "object") throw new Error("catalog.json invalide");
  if (!Array.isArray(data.apps) || !Array.isArray(data.games))
    throw new Error("catalog.json doit contenir apps[] et games[]");

  // Filtre sécurité : on garde seulement les objets avec id + title/name
  const apps = data.apps.filter((x) => x && typeof x === "object" && x.id);
  const games = data.games.filter((x) => x && typeof x === "object" && x.id);

  return { apps, games };
}

function randomPick(list, avoidSet) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const clean = list.filter((x) => x && x.id);

  // si on évite, on tente de prendre hors set
  const available = avoidSet ? clean.filter((x) => !avoidSet.has(x.id)) : clean;

  const pool = available.length ? available : clean;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

function renderSoftware(item) {
  if (!item) {
    $("#softTitle").textContent = "—";
    $("#softDesc").textContent = "—";
    $("#softTags").innerHTML = "";
    $("#softLinks").innerHTML = "";
    return;
  }
  $("#softTitle").textContent = item.title || item.name || "—";
  $("#softDesc").textContent = item.shortDesc || item.desc || "";
  setTags($("#softTags"), item.tags);
  $("#softLinks").innerHTML = "";
  addLink($("#softLinks"), "⬇ Télécharger logiciel", pickUrl(item));
  addLink($("#softLinks"), "Site officiel", item.links?.official);
  addLink($("#softLinks"), "Flathub", item.links?.flathub);
}

function renderGame(item) {
  if (!item) {
    $("#gameTitle").textContent = "—";
    $("#gameDesc").textContent = "—";
    $("#gameTags").innerHTML = "";
    $("#gameLinks").innerHTML = "";
    return;
  }
  $("#gameTitle").textContent = item.title || item.name || "—";
  $("#gameDesc").textContent = item.shortDesc || item.desc || "";
  setTags($("#gameTags"), item.tags);
  $("#gameLinks").innerHTML = "";
  addLink($("#gameLinks"), "⬇ Télécharger jeu", pickUrl(item));
  addLink($("#gameLinks"), "Site officiel", item.links?.official);
  addLink($("#gameLinks"), "Flathub", item.links?.flathub);
  addLink($("#gameLinks"), "Steam", item.links?.steam);
  addLink($("#gameLinks"), "itch.io", item.links?.itch);
}

function setError(msg) {
  const box = $("#errorBox");
  if (!box) return;
  box.innerHTML = msg
    ? `<div class="danger">❌ ${esc(msg)}</div>`
    : "";
}

function applyFromQueryParams(catalog) {
  const p = new URLSearchParams(window.location.search);
  const sid = p.get("s");
  const gid = p.get("g");

  let soft = null;
  let game = null;

  if (sid) soft = catalog.apps.find((x) => x.id === sid) || null;
  if (gid) game = catalog.games.find((x) => x.id === gid) || null;

  // si au moins un valide, on affiche
  if (soft || game) {
    renderSoftware(soft);
    renderGame(game);
    return { soft, game, usedQuery: true };
  }
  return { soft: null, game: null, usedQuery: false };
}

function buildShareLink(soft, game) {
  const u = new URL(window.location.href);
  u.searchParams.delete("s");
  u.searchParams.delete("g");

  if (soft?.id) u.searchParams.set("s", soft.id);
  if (game?.id) u.searchParams.set("g", game.id);

  return u.toString();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  }
}

(async function init() {
  try {
    setError("");

    const catalog = await loadCatalog();

    // Applique mode/avoid depuis URL si tu veux (optionnel)
    // (On garde simple)

    // Si lien partagé ?s=...&g=...
    const fromQuery = applyFromQueryParams(catalog);
    let currentSoft = fromQuery.soft;
    let currentGame = fromQuery.game;

    function roll() {
      setError("");

      const mode = $("#mode")?.value || "both";
      const avoid = ($("#avoid")?.value || "on") === "on";

      const recent = recentGet();
      const avoidSoft = avoid ? new Set(recent.softwares || []) : null;
      const avoidGame = avoid ? new Set(recent.games || []) : null;

      if (mode === "software" || mode === "both") {
        currentSoft = randomPick(catalog.apps, avoidSoft);
        renderSoftware(currentSoft);
        if (currentSoft?.id) recentPush("software", currentSoft.id);
      } else {
        currentSoft = null;
        renderSoftware(null);
      }

      if (mode === "game" || mode === "both") {
        currentGame = randomPick(catalog.games, avoidGame);
        renderGame(currentGame);
        if (currentGame?.id) recentPush("game", currentGame.id);
      } else {
        currentGame = null;
        renderGame(null);
      }

      // Met à jour l’URL sans recharger (pratique pour partager)
      const share = buildShareLink(currentSoft, currentGame);
      window.history.replaceState({}, "", share);
    }

    // Si pas de query valide, on lance un roll auto
    if (!fromQuery.usedQuery) roll();

    // Actions
    $("#roll")?.addEventListener("click", roll);

    $("#share")?.addEventListener("click", async () => {
      const link = buildShareLink(currentSoft, currentGame);
      await copyToClipboard(link);
      alert("Lien copié ✅");
    });

    $("#reset")?.addEventListener("click", () => {
      resetAll();
      alert("Réinitialisé ✅ (anti-répétition)");
    });

    $("#favSoftware")?.addEventListener("click", () => {
      if (!currentSoft) return alert("Aucun logiciel sélectionné.");
      favoritesAdd(currentSoft, "software");
      alert("Ajouté aux favoris ⭐");
    });

    $("#favGame")?.addEventListener("click", () => {
      if (!currentGame) return alert("Aucun jeu sélectionné.");
      favoritesAdd(currentGame, "game");
      alert("Ajouté aux favoris ⭐");
    });

  } catch (err) {
    console.error(err);
    setError(err?.message || String(err));
  }
})();