// js/app.js
"use strict";

import { loadFavs, toggleFav, isFav, favButtonHTML } from "./favs.js";

const $ = (s) => document.querySelector(s);

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Erreur chargement ${path}`);
  return res.json();
}

function safeText(s) {
  return String(s ?? "");
}

function buildLinks(item) {
  const links = [];
  const L = item?.links || {};
  if (L.download) links.push({ label: "Télécharger", url: L.download });
  if (L.official) links.push({ label: "Site officiel", url: L.official });
  if (L.flathub) links.push({ label: "Flathub", url: L.flathub });
  if (L.steam) links.push({ label: "Steam", url: L.steam });
  if (L.itch) links.push({ label: "itch.io", url: L.itch });
  return links;
}

function linkHTML(l) {
  // sécurité : rel noopener
  const u = String(l.url || "#");
  const t = safeText(l.label || "Lien");
  return `<a class="link" href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`;
}

function itemCardHTML(item, typeLabel) {
  const id = item?.id || "";
  const fav = id ? isFav(id) : false;

  const title = safeText(item?.title || item?.name || "—");
  const desc = safeText(item?.shortDesc || item?.desc || "");
  const links = buildLinks(item);

  return `
    <article class="card">
      <div class="inner" style="position:relative">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px">
          <div>
            <div class="muted"><b>${safeText(typeLabel)}</b></div>
            <h3 style="margin:6px 0 8px">${title}</h3>
            <div class="muted">${desc}</div>
          </div>
          ${id ? favButtonHTML(id, fav) : ""}
        </div>

        <div class="links" style="margin-top:10px">
          ${links.map(linkHTML).join("")}
        </div>
      </div>
    </article>
  `;
}

function installFavClicks(root = document) {
  root.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-fav]");
    if (!btn) return;

    const id = btn.getAttribute("data-fav");
    toggleFav(id);

    // refresh UI bouton
    const active = isFav(id);
    btn.classList.toggle("active", active);
    btn.title = active ? "Retirer des favoris" : "Ajouter aux favoris";
    btn.setAttribute("aria-label", btn.title);

    // refresh “Top favoris” si présent
    renderTopFavs(window.__GL_CATALOG__);
  });
}

/* ============
   TOP FAVORIS (Accueil)
============ */
function renderTopFavs(catalog) {
  // Sur ta page d’accueil tu as déjà une section “Top favoris”.
  // On tente de trouver un conteneur existant, sinon on ne fait rien.
  const box =
    document.querySelector('[data-top-favs]') ||
    document.querySelector("#topFavs") ||
    document.querySelector("#topFavorites") ||
    null;

  if (!box || !catalog) return;

  const favIds = loadFavs();
  if (favIds.length === 0) {
    box.innerHTML =
      `<div class="note">Aucun favori pour l’instant. Clique sur ⭐ pour en ajouter.</div>`;
    return;
  }

  const index = new Map();
  (catalog.apps || []).forEach((a) => index.set(a.id, { ...a, _type: "🧩 Logiciel" }));
  (catalog.games || []).forEach((g) => index.set(g.id, { ...g, _type: "🎮 Jeu" }));

  const items = favIds
    .map((id) => index.get(id))
    .filter(Boolean)
    .slice(0, 6);

  if (items.length === 0) {
    box.innerHTML =
      `<div class="note">Tes favoris ne sont plus dans le catalogue (ou ids changés).</div>`;
    return;
  }

  box.innerHTML = `
    <div class="grid2">
      ${items.map((it) => itemCardHTML(it, it._type)).join("")}
    </div>
    <div style="height:10px"></div>
    <a class="btn" href="./favorites.html">Voir tous mes favoris ⭐</a>
  `;
}

/* ============
   RECHERCHE (optionnel si tu l’as déjà)
============ */
function enableSearch(catalog) {
  const input = $("#searchInput");
  const results = $("#searchResults");
  if (!input || !results) return;

  const index = [
    ...(catalog.apps || []).map((a) => ({ ...a, _type: "🧩 Logiciel" })),
    ...(catalog.games || []).map((g) => ({ ...g, _type: "🎮 Jeu" })),
  ];

  input.addEventListener("input", () => {
    const q = normalize(input.value);
    results.innerHTML = "";
    if (!q || q.length < 2) return;

    const found = index.filter((item) => {
      const hay = normalize(
        `${item.title} ${item.shortDesc} ${(item.tags || []).join(" ")}`
      );
      return hay.includes(q);
    });

    if (found.length === 0) {
      results.innerHTML = `<div class="note">Aucun résultat.</div>`;
      return;
    }

    results.innerHTML = `
      <div class="grid2">
        ${found.slice(0, 12).map((it) => itemCardHTML(it, it._type)).join("")}
      </div>
    `;
  });
}

/* ============
   CSS minimal pour ⭐ (injecté si pas déjà présent)
============ */
function ensureFavCSS() {
  if (document.getElementById("favCSS")) return;
  const css = document.createElement("style");
  css.id = "favCSS";
  css.textContent = `
    .fav-btn{
      border:1px solid var(--border);
      background: rgba(0,0,0,.18);
      color: var(--text);
      width:42px; height:42px;
      border-radius: 12px;
      cursor:pointer;
      font-size:18px;
      display:inline-flex; align-items:center; justify-content:center;
      transition: transform .12s ease, border-color .12s ease;
    }
    .fav-btn:hover{ transform: translateY(-1px); }
    .fav-btn.active{
      border-color: rgba(255,204,102,.55);
      background: rgba(255,204,102,.12);
    }
  `;
  document.head.appendChild(css);
}

/* ============
   INIT
============ */
(async function init() {
  try {
    ensureFavCSS();
    installFavClicks(document);

    const catalog = await loadJSON("./data/catalog.json");
    window.__GL_CATALOG__ = catalog;

    // Top favoris sur accueil si tu as un conteneur
    renderTopFavs(catalog);

    // Recherche si présente
    enableSearch(catalog);
  } catch (e) {
    console.error(e);
  }
})();
