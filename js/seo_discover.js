// js/seo_discover.js
"use strict";

/**
 * SEO Discover (OpenGraph + JSON-LD) — sans tracking
 * Source de vérité :
 * - URL params : ?s=<software_id>&g=<game_id>&d=<YYYY-MM-DD (optionnel)>
 * - et data/catalog.json pour retrouver titres + liens officiels
 *
 * Si ids introuvables, fallback vers "Découvrir au hasard — Giveaway Linux"
 */

const BASE = new URL("./", window.location.href);
const CATALOG_URL = new URL("data/catalog.json", BASE).toString();

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function ensureMeta(propertyOrName, value, isName = false) {
  if (!value) return;
  const head = document.head || document.getElementsByTagName("head")[0];
  const selector = isName ? `meta[name="${propertyOrName}"]` : `meta[property="${propertyOrName}"]`;
  let meta = head.querySelector(selector);
  if (!meta) {
    meta = document.createElement("meta");
    if (isName) meta.setAttribute("name", propertyOrName);
    else meta.setAttribute("property", propertyOrName);
    head.appendChild(meta);
  }
  meta.setAttribute("content", value);
}

function ensureLink(rel, href, extra = {}) {
  if (!href) return;
  const head = document.head || document.getElementsByTagName("head")[0];
  let link = head.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    head.appendChild(link);
  }
  link.setAttribute("href", href);
  Object.entries(extra).forEach(([k, v]) => link.setAttribute(k, v));
}

function setCanonical(url) {
  ensureLink("canonical", url);
}

function setJsonLd(obj) {
  const head = document.head || document.getElementsByTagName("head")[0];
  let tag = head.querySelector('script[type="application/ld+json"][data-gl="discover"]');
  if (!tag) {
    tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.setAttribute("data-gl", "discover");
    head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(obj, null, 2);
}

async function loadCatalog() {
  const res = await fetch(CATALOG_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Impossible de charger data/catalog.json (HTTP ${res.status})`);
  return await res.json();
}

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    s: (p.get("s") || "").trim(),
    g: (p.get("g") || "").trim(),
    d: (p.get("d") || "").trim(), // optionnel (YYYY-MM-DD)
  };
}

function isISODate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function toISODate(d) {
  return isISODate(d) ? `${d}T00:00:00Z` : "";
}

function buildShareUrl(s, g, d) {
  const u = new URL("discover.html", BASE);
  if (s) u.searchParams.set("s", s);
  if (g) u.searchParams.set("g", g);
  if (isISODate(d)) u.searchParams.set("d", d);
  return u.toString();
}

(async function initDiscoverSEO() {
  try {
    const { s, g, d } = getParams();

    // URL canonique = URL “propre” (juste s/g/d)
    const canonical = buildShareUrl(s, g, d);
    setCanonical(canonical);

    const catalog = await loadCatalog();
    const apps = Array.isArray(catalog?.apps) ? catalog.apps : [];
    const games = Array.isArray(catalog?.games) ? catalog.games : [];

    const app = s ? apps.find(x => x?.id === s) : null;
    const game = g ? games.find(x => x?.id === g) : null;

    // Fallback si rien
    const siteName = "Giveaway Linux";
    const ogImg = new URL("assets/logo.svg", BASE).toString();

    if (!app || !game) {
      const title = `Découvrir au hasard — ${siteName}`;
      const desc = `Découvre une paire logiciel + jeu au hasard (liens officiels) — sans tracking.`;

      ensureMeta("og:site_name", siteName);
      ensureMeta("og:type", "website");
      ensureMeta("og:title", title);
      ensureMeta("og:description", desc);
      ensureMeta("og:url", canonical);
      ensureMeta("og:image", ogImg);

      ensureMeta("twitter:card", "summary", true);
      ensureMeta("twitter:title", title, true);
      ensureMeta("twitter:description", desc, true);
      ensureMeta("twitter:image", ogImg, true);

      setJsonLd({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "url": canonical,
        "description": desc,
        "inLanguage": "fr",
        "isPartOf": { "@type": "WebSite", "name": siteName, "url": new URL("index.html", BASE).toString() }
      });

      return;
    }

    const appName = app.title || app.name || "Logiciel";
    const gameName = game.title || game.name || "Jeu";
    const dateTxt = isISODate(d) ? ` (${d})` : "";
    const title = `Découvrir — ${appName} + ${gameName}${dateTxt} • ${siteName}`;
    const desc = `Découverte au hasard${isISODate(d) ? ` (${d})` : ""} : ${appName} + ${gameName} — liens officiels uniquement, sans tracking.`;

    ensureMeta("og:site_name", siteName);
    ensureMeta("og:type", "website");
    ensureMeta("og:title", title);
    ensureMeta("og:description", desc);
    ensureMeta("og:url", canonical);
    ensureMeta("og:image", ogImg);

    ensureMeta("twitter:card", "summary", true);
    ensureMeta("twitter:title", title, true);
    ensureMeta("twitter:description", desc, true);
    ensureMeta("twitter:image", ogImg, true);

    // JSON-LD (WebPage + ItemList)
    const appUrl = pickUrl(app) || canonical;
    const gameUrl = pickUrl(game) || canonical;

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "name": siteName,
          "url": new URL("index.html", BASE).toString(),
          "inLanguage": "fr",
          "description": "Chaque jour : 1 logiciel + 1 jeu gratuits pour Linux, liens officiels uniquement."
        },
        {
          "@type": "WebPage",
          "name": title,
          "url": canonical,
          "description": desc,
          "inLanguage": "fr",
          "datePublished": toISODate(d) || undefined,
          "isPartOf": { "@type": "WebSite", "name": siteName, "url": new URL("index.html", BASE).toString() }
        },
        {
          "@type": "ItemList",
          "name": `Découvrir${isISODate(d) ? ` (${d})` : ""}`,
          "itemListOrder": "https://schema.org/ItemListUnordered",
          "numberOfItems": 2,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": appName, "url": appUrl },
            { "@type": "ListItem", "position": 2, "name": gameName, "url": gameUrl }
          ]
        }
      ].filter(Boolean)
    };

    setJsonLd(jsonLd);

    // Optionnel : titre dynamique de l’onglet
    // document.title = title;

  } catch (e) {
    console.warn("SEO discover:", e?.message || e);
  }
})();
