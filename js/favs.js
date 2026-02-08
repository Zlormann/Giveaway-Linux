// js/favs.js
"use strict";

const FAV_KEY = "gl_favs_v1";

export function loadFavs() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveFavs(ids) {
  const clean = Array.from(new Set(ids)).filter(Boolean);
  localStorage.setItem(FAV_KEY, JSON.stringify(clean));
  return clean;
}

export function isFav(id) {
  return loadFavs().includes(id);
}

export function toggleFav(id) {
  const favs = loadFavs();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.unshift(id);
  return saveFavs(favs);
}

export function clearFavs() {
  localStorage.removeItem(FAV_KEY);
}

export function favButtonHTML(id, active) {
  // bouton “safe” : pas d’HTML user injecté, juste un id
  const cls = active ? "fav-btn active" : "fav-btn";
  const title = active ? "Retirer des favoris" : "Ajouter aux favoris";
  return `<button class="${cls}" type="button" data-fav="${escapeAttr(
    id
  )}" aria-label="${title}" title="${title}">⭐</button>`;
}

function escapeAttr(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}