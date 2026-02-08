// scripts/build-rss.mjs
"use strict";

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PICKS_PATH = path.join(ROOT, "data", "picks.json");
const OUT_PATH = path.join(ROOT, "rss.xml");

// ⚠️ Mets ici l’URL de ton site GitHub Pages (important pour les lecteurs RSS)
const SITE_URL = "https://zlormann.github.io/Giveaway-Linux/";
// URL du flux (self)
const FEED_URL = `${SITE_URL}rss.xml`;
// Lien principal du site
const HOME_URL = `${SITE_URL}`;
// Tu peux pointer sur archive.html si tu préfères :
const ARCHIVE_URL = `${SITE_URL}archive.html`;

const CHANNEL_TITLE = "Giveaway Linux";
const CHANNEL_DESC =
  "Chaque jour : 1 logiciel + 1 jeu gratuits pour Linux — liens officiels uniquement (sans tracking).";
const LANGUAGE = "fr-FR";

// Combien d’items RSS max (ex: 30 jours)
const MAX_ITEMS = 30;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isoToRfc822(isoDateYYYYMMDD) {
  // Convertit YYYY-MM-DD → RFC822 (en UTC à 08:00 pour un ordre stable)
  const [y, m, d] = isoDateYYYYMMDD.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 8, 0, 0));
  // Ex: "Sun, 08 Feb 2026 08:00:00 GMT"
  return dt.toUTCString();
}

function xmlEscape(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeUrl(u) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  // autorise seulement http(s)
  if (!/^https?:\/\//i.test(s)) return "";
  return s;
}

function pickDownloadLink(item) {
  // priorités : download > official > flathub/steam/itch
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

function itemTitle(entry) {
  const appTitle = entry?.app?.title || entry?.app?.name || "Logiciel";
  const gameTitle = entry?.game?.title || entry?.game?.name || "Jeu";
  return `${entry.date} — ${appTitle} + ${gameTitle}`;
}

function itemDescription(entry) {
  const app = entry?.app || {};
  const game = entry?.game || {};

  const appName = xmlEscape(app.title || app.name || "Logiciel");
  const gameName = xmlEscape(game.title || game.name || "Jeu");

  const appDesc = xmlEscape(app.shortDesc || app.desc || "");
  const gameDesc = xmlEscape(game.shortDesc || game.desc || "");

  const appDl = safeUrl(pickDownloadLink(app));
  const gameDl = safeUrl(pickDownloadLink(game));

  // ✅ Liens directs demandés + style “suite internet”
  // On met ça en CDATA (mais on échappe quand même les URLs)
  return `<![CDATA[
<div>
  <p><b>🧩 Logiciel :</b> ${appName}${appDesc ? ` — ${appDesc}` : ""}</p>
  ${appDl ? `<p><a href="${xmlEscape(appDl)}" target="_blank" rel="noopener">⬇ Télécharger logiciel (officiel)</a></p>` : ""}
  <hr/>
  <p><b>🎮 Jeu :</b> ${gameName}${gameDesc ? ` — ${gameDesc}` : ""}</p>
  ${gameDl ? `<p><a href="${xmlEscape(gameDl)}" target="_blank" rel="noopener">⬇ Télécharger jeu (officiel)</a></p>` : ""}
  <p style="opacity:.8">✅ Liens officiels uniquement • ✅ Aucun tracking</p>
</div>
]]>`;
}

function buildRss(picks) {
  // Compose la liste des entrées : current + history
  const entries = [];

  if (picks?.current?.date) entries.push(picks.current);
  if (Array.isArray(picks?.history)) entries.push(...picks.history);

  // dédoublonne par date (au cas où)
  const seen = new Set();
  const unique = [];
  for (const e of entries) {
    if (!e?.date || seen.has(e.date)) continue;
    seen.add(e.date);
    unique.push(e);
  }

  // tri décroissant par date
  unique.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const items = unique.slice(0, MAX_ITEMS).map((e) => {
    const title = itemTitle(e);
    const link = ARCHIVE_URL; // tu peux mettre HOME_URL si tu préfères
    const guid = `giveaway-linux:${e.date}:${e.issue || "noissue"}`;
    const pubDate = isoToRfc822(e.date);
    const desc = itemDescription(e);

    return `
    <item>
      <title>${xmlEscape(title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">${xmlEscape(guid)}</guid>
      <pubDate>${xmlEscape(pubDate)}</pubDate>
      <description>${desc}</description>
    </item>`.trim();
  });

  // channel pubDate = date la plus récente si possible
  const channelDate = unique[0]?.date ? isoToRfc822(unique[0].date) : new Date().toUTCString();

  // RSS 2.0 + atom:link (demandé)
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(CHANNEL_TITLE)}</title>
    <link>${xmlEscape(HOME_URL)}</link>
    <description>${xmlEscape(CHANNEL_DESC)}</description>
    <language>${xmlEscape(LANGUAGE)}</language>
    <lastBuildDate>${xmlEscape(channelDate)}</lastBuildDate>

    <atom:link href="${xmlEscape(FEED_URL)}" rel="self" type="application/rss+xml" />

${items.join("\n\n")}
  </channel>
</rss>
`;
}

function main() {
  if (!fs.existsSync(PICKS_PATH)) {
    console.error("❌ data/picks.json introuvable");
    process.exit(1);
  }

  const picks = readJson(PICKS_PATH);
  const rss = buildRss(picks);

  fs.writeFileSync(OUT_PATH, rss, "utf8");
  console.log("✅ rss.xml généré :", OUT_PATH);
}

main();