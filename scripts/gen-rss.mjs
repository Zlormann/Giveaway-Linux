import fs from "node:fs";

const SITE = "https://zlormann.github.io/Giveaway-Linux/";
const FEED_URL = SITE + "rss.xml";
const PICKS_PATH = "data/picks.json";
const OUT_PATH = "rss.xml";

// Combien d'items max dans le flux (sélection + historiques)
const MAX_ITEMS = 60;

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function xmlEscape(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toRFC822(dateISO) {
  // dateISO : YYYY-MM-DD
  const d = new Date(`${dateISO}T12:00:00Z`);
  return d.toUTCString();
}

function normalizeUrl(u) {
  try {
    return new URL(u).toString();
  } catch {
    return null;
  }
}

function pickUrl(obj) {
  const L = obj?.links || {};
  return (
    normalizeUrl(L.download) ||
    normalizeUrl(L.official) ||
    normalizeUrl(L.flathub) ||
    normalizeUrl(L.steam) ||
    normalizeUrl(L.itch) ||
    null
  );
}

function itemLink(entry) {
  // Pour un site statique sans page /YYYY/MM/DD :
  // on utilise la page d'accueil + ancre issue/date pour être stable.
  const anchor = entry?.issue ? `issue-${entry.issue}` : `date-${entry.date}`;
  return SITE + `#${encodeURIComponent(anchor)}`;
}

function buildItem(entry) {
  const date = entry?.date || "1970-01-01";
  const issue = entry?.issue || "—";

  const app = entry?.app || {};
  const game = entry?.game || {};

  const appTitle = app.title || "Logiciel";
  const gameTitle = game.title || "Jeu";

  const title = `[#${issue}] ${appTitle} + ${gameTitle}`;

  const appUrl = pickUrl(app);
  const gameUrl = pickUrl(game);

  const descParts = [];
  descParts.push(`<p><b>🧩 Logiciel :</b> ${xmlEscape(appTitle)}</p>`);
  if (app.shortDesc) descParts.push(`<p>${xmlEscape(app.shortDesc)}</p>`);
  if (appUrl) descParts.push(`<p>⬇ <a href="${xmlEscape(appUrl)}">Télécharger logiciel (officiel)</a></p>`);

  descParts.push(`<hr />`);

  descParts.push(`<p><b>🎮 Jeu :</b> ${xmlEscape(gameTitle)}</p>`);
  if (game.shortDesc) descParts.push(`<p>${xmlEscape(game.shortDesc)}</p>`);
  if (gameUrl) descParts.push(`<p>⬇ <a href="${xmlEscape(gameUrl)}">Télécharger jeu (officiel)</a></p>`);

  descParts.push(`<p><small>✅ Liens officiels • ✅ Aucun tracking • Giveaway Linux</small></p>`);

  const link = itemLink(entry);

  // GUID stable : issue+date
  const guid = `${SITE}rss#${issue}-${date}`;

  return `
    <item>
      <title>${xmlEscape(title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">${xmlEscape(guid)}</guid>
      <pubDate>${xmlEscape(toRFC822(date))}</pubDate>
      <description><![CDATA[
${descParts.join("\n")}
      ]]></description>
    </item>
  `.trim();
}

function main() {
  const picks = loadJson(PICKS_PATH);

  const items = [];

  if (picks?.current?.date) items.push(picks.current);
  if (Array.isArray(picks?.history)) items.push(...picks.history);

  // trie récent -> ancien, limite
  items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const sliced = items.slice(0, MAX_ITEMS);

  const lastBuild = new Date().toUTCString();

  const channelTitle = "Giveaway Linux — 1 logiciel + 1 jeu gratuits (liens officiels)";
  const channelDesc =
    "Chaque jour : 1 logiciel + 1 jeu gratuits pour Linux. Liens officiels uniquement. Aucun tracking.";

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(channelTitle)}</title>
    <link>${xmlEscape(SITE)}</link>
    <atom:link href="${xmlEscape(FEED_URL)}" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(channelDesc)}</description>
    <language>fr</language>
    <lastBuildDate>${xmlEscape(lastBuild)}</lastBuildDate>

${sliced.map(buildItem).join("\n\n")}
  </channel>
</rss>
`;

  fs.writeFileSync(OUT_PATH, rss, "utf8");
  console.log(`✅ rss.xml généré (${sliced.length} items)`);
}

main();
