// js/seo.js
"use strict";

/**
 * SEO avancé (OpenGraph + JSON-LD) — sans tracking
 * - Lit data/picks.json (sélection du jour)
 * - Met à jour les meta og:title/og:description/og:url + twitter cards
 * - Ajoute un JSON-LD (WebSite + ItemList léger + CreativeWork)
 *
 * Compatible GitHub Pages (base URL dynamique)
 */

const BASE = new URL("./", window.location.href);
const PICKS_URL = new URL("data/picks.json", BASE).toString();

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
  let tag = head.querySelector('script[type="application/ld+json"][data-gl="1"]');
  if (!tag) {
    tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.setAttribute("data-gl", "1");
    head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(obj, null, 2);
}

async function loadPicks() {
  const res = await fetch(PICKS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Impossible de charger data/picks.json (HTTP ${res.status})`);
  return await res.json();
}

function toISODate(d) {
  // d: "YYYY-MM-DD"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return "";
  return `${d}T00:00:00Z`;
}

(async function initSEO() {
  try {
    const picks = await loadPicks();
    const cur = picks?.current;
    if (!cur?.date || !cur?.app || !cur?.game) return;

    const app = cur.app;
    const game = cur.game;

    // Titre/desc dynamiques
    const title = `Giveaway Linux — ${app.title || app.name || "Logiciel"} + ${game.title || game.name || "Jeu"} (${cur.date})`;
    const desc = `Sélection du jour (${cur.date}) : ${app.title || app.name || "Logiciel"} + ${game.title || game.name || "Jeu"} — liens officiels uniquement, sans tracking.`;

    // URL de la page (canonique)
    const pageUrl = new URL("index.html", BASE).toString();

    // === OpenGraph / Twitter ===
    ensureMeta("og:site_name", "Giveaway Linux");
    ensureMeta("og:type", "website");
    ensureMeta("og:title", title);
    ensureMeta("og:description", desc);
    ensureMeta("og:url", pageUrl);

    // Image (on utilise ton logo SVG — c’est OK, mais certains réseaux préfèrent PNG)
    // Option: remplacer par ./assets/og.png si tu en ajoutes un.
    const ogImg = new URL("assets/logo.svg", BASE).toString();
    ensureMeta("og:image", ogImg);

    ensureMeta("twitter:card", "summary", true);
    ensureMeta("twitter:title", title, true);
    ensureMeta("twitter:description", desc, true);
    ensureMeta("twitter:image", ogImg, true);

    setCanonical(pageUrl);

    // === JSON-LD (WebSite + CreativeWork + ItemList léger) ===
    const appUrl = pickUrl(app);
    const gameUrl = pickUrl(game);

    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "name": "Giveaway Linux",
          "url": pageUrl,
          "description": "Chaque jour : 1 logiciel + 1 jeu gratuits pour Linux, liens officiels uniquement.",
          "inLanguage": "fr",
          "publisher": {
            "@type": "Organization",
            "name": "Giveaway Linux"
          }
        },
        {
          "@type": "CreativeWork",
          "name": title,
          "datePublished": toISODate(cur.date) || undefined,
          "inLanguage": "fr",
          "url": pageUrl,
          "description": desc,
          "isPartOf": {
            "@type": "WebSite",
            "name": "Giveaway Linux",
            "url": pageUrl
          }
        },
        {
          "@type": "ItemList",
          "name": `Sélection du jour (${cur.date})`,
          "itemListOrder": "https://schema.org/ItemListUnordered",
          "numberOfItems": 2,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": app.title || app.name || "Logiciel",
              "url": appUrl || pageUrl
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": game.title || game.name || "Jeu",
              "url": gameUrl || pageUrl
            }
          ]
        }
      ].filter(Boolean)
    };

    setJsonLd(jsonLd);

    // Optionnel : mettre à jour le <title> (si tu veux vraiment le titre dynamique)
    // document.title = title;

  } catch (e) {
    // SEO ne doit jamais casser la page
    console.warn("SEO init:", e?.message || e);
  }
})();