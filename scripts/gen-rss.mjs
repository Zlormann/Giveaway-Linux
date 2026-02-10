import fs from "node:fs";

const SITE = "https://zlormann.github.io/Giveaway-Linux";
const OUT = "rss.xml";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function escXml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function isoToRfc2822(dateISO) {
  // dateISO: "YYYY-MM-DD"
  const d = new Date(`${dateISO}T12:00:00Z`);
  return d.toUTCString(); // RFC2822 ok
}

function pickBestUrl(obj) {
  return obj?.url || obj?.download_url || obj?.home_url || "";
}

function itemBlock({ title, link, guid, pubDate, description }) {
  return `
    <item>
      <title>${escXml(title)}</title>
      <link>${escXml(link)}</link>
      <guid isPermaLink="false">${escXml(guid)}</guid>
      <pubDate>${escXml(pubDate)}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
}

function main() {
  const picks = readJson("data/picks.json");
  const catalog = readJson("data/catalog.json"); // liste d’archives 30 jours
  const software = readJson("data/software.json");
  const games = readJson("data/games.json");

  // On fabrique une liste d’entrées RSS = current + catalog (sans doublons date)
  const entries = [];
  if (picks?.current?.date) {
    entries.push({
      date: picks.current.date,
      software_id: picks.current.software_id,
      game_id: picks.current.game_id,
    });
  }

  if (Array.isArray(catalog)) {
    for (const e of catalog) {
      if (!e?.date) continue;
      entries.push({
        date: e.date,
        software_id: e.software_id,
        game_id: e.game_id,
      });
    }
  }

  // Dédoublonnage par date (premier gagne)
  const seen = new Set();
  const unique = entries.filter(e => {
    if (!e.date) return false;
    if (seen.has(e.date)) return false;
    seen.add(e.date);
    return true;
  });

  // Tri du plus récent au plus ancien
  unique.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const items = unique.slice(0, 30).map((e) => {
    const s = software.find(x => x.id === e.software_id);
    const g = games.find(x => x.id === e.game_id);

    const sName = s?.name || "Logiciel";
    const gName = g?.name || "Jeu";
    const sUrl = pickBestUrl(s);
    const gUrl = pickBestUrl(g);

    const title = `(${e.date}) ${sName} + ${gName}`;
    const link = `${SITE}/`; // page principale (simple)
    const guid = `giveawaylinux:${e.date}:${e.software_id}:${e.game_id}`;
    const pubDate = isoToRfc2822(e.date);

    const desc = `
      <p><b>🧩 Logiciel :</b> ${escXml(sName)} ${sUrl ? `— <a href="${escXml(sUrl)}" target="_blank" rel="noopener">Lien officiel</a>` : ""}</p>
      <p><b>🎮 Jeu :</b> ${escXml(gName)} ${gUrl ? `— <a href="${escXml(gUrl)}" target="_blank" rel="noopener">Lien officiel</a>` : ""}</p>
      <p><i>Rappel :</i> liens officiels uniquement • aucun tracking.</p>
    `;

    return itemBlock({ title, link, guid, pubDate, description: desc });
  });

  const now = new Date().toUTCString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Giveaway Linux</title>
    <link>${SITE}/</link>
    <description>Chaque jour : 1 logiciel + 1 jeu gratuits pour Linux (liens officiels uniquement). Archives & favoris locaux. Sans tracking.</description>
    <language>fr</language>
    <lastBuildDate>${escXml(now)}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    ${items.join("\n")}
  </channel>
</rss>
`;

  fs.writeFileSync(OUT, rss, "utf8");
  console.log("✅ RSS généré :", OUT);
}

main();
