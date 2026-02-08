"use strict";

const $ = (s) => document.querySelector(s);

const BASE = new URL("./", window.location.href);
const PICKS_URL = new URL("data/picks.json", BASE).toString();
const CATALOG_URL = new URL("data/catalog.json", BASE).toString();

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
  if (!/^https?:\/\//i.test(s)) return "";
  return s;
}

function link(label, url) {
  const u = safeUrl(url);
  if (!u) return "";
  return `<a class="link" href="${u}" target="_blank" rel="noopener">${label}</a>`;
}

function renderToday(app, game) {
  const box = $("#todayBox");
  if (!box) return;

  box.innerHTML = `
    <div class="card">
      <div class="inner">
        <b>🧩 ${esc(app.title)}</b>
        <div class="muted">${esc(app.shortDesc || "")}</div>
        <div class="links">
          ${link("⬇ Télécharger logiciel", app.links?.download || app.links?.official)}
          ${link("Site officiel", app.links?.official)}
          ${link("Flathub", app.links?.flathub)}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="inner">
        <b>🎮 ${esc(game.title)}</b>
        <div class="muted">${esc(game.shortDesc || "")}</div>
        <div class="links">
          ${link("⬇ Télécharger jeu", game.links?.download || game.links?.official)}
          ${link("Site officiel", game.links?.official)}
          ${link("Flathub", game.links?.flathub)}
          ${link("Steam", game.links?.steam)}
          ${link("itch.io", game.links?.itch)}
        </div>
      </div>
    </div>
  `;
}

function renderLast7(history, catalog) {
  const box = $("#last7Box");
  if (!box) return;

  if (!history.length) {
    box.innerHTML = `<div class="note">Aucune archive disponible.</div>`;
    return;
  }

  box.innerHTML = history.slice(0, 7).map(h => {
    const app = catalog.apps.find(a => a.id === h.app?.id);
    const game = catalog.games.find(g => g.id === h.game?.id);
    if (!app || !game) return "";

    return `
      <div class="card">
        <div class="inner">
          <div class="muted">${h.date}</div>
          <b>🧩 ${esc(app.title)}</b> • 🎮 ${esc(game.title)}
        </div>
      </div>
    `;
  }).join("");
}

(async function init() {
  try {
    const picksRes = await fetch(PICKS_URL, { cache: "no-store" });
    const catalogRes = await fetch(CATALOG_URL, { cache: "no-store" });

    if (!picksRes.ok || !catalogRes.ok) {
      throw new Error("Impossible de charger les données");
    }

    const picks = await picksRes.json();
    const catalog = await catalogRes.json();

    if (!catalog.apps || !catalog.games) {
      throw new Error("catalog.json invalide");
    }

    renderToday(picks.current.app, picks.current.game);
    renderLast7(picks.history || [], catalog);

  } catch (e) {
    console.error(e);
    const today = $("#todayBox");
    if (today) today.innerHTML = `<div class="danger">❌ Erreur de chargement</div>`;
  }
})();
