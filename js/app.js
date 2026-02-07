(() => {
  const contentEl = document.getElementById("content");
  if (!contentEl) return;

  // Optionnel : si tu ajoutes <span id="pick-date"></span> dans index.html
  const dateEl = document.getElementById("pick-date");

  // Base URL = dossier de la page courante (ex: https://.../Giveaway-Linux/)
  const base = new URL("./", window.location.href);

  async function loadJSON(path) {
    const u = new URL(path, base).toString();
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${path}`);
    return res.json();
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pickUrl(obj) {
    // compatible avec ton format actuel (url)
    // + support futur si tu ajoutes home_url / download_url
    return obj?.download_url || obj?.home_url || obj?.url || "#";
  }

  (async () => {
    try {
      const [pick, softwareList, gamesList] = await Promise.all([
        loadJSON("data/picks.json"),
        loadJSON("data/software.json"),
        loadJSON("data/games.json"),
      ]);

      // Affiche la date si l'élément existe
      if (dateEl) dateEl.textContent = pick?.date || "—";

      // Sécurités
      const softId = pick?.software_id;
      const gameId = pick?.game_id;

      const software = Array.isArray(softwareList) && softId
        ? softwareList.find(s => s.id === softId)
        : null;

      const game = Array.isArray(gamesList) && gameId
        ? gamesList.find(g => g.id === gameId)
        : null;

      const softName = software?.name || "Aucun logiciel trouvé.";
      const softMeta = software?.category || "—";
      const softUrl = pickUrl(software);

      const gameName = game?.name || "Aucun jeu trouvé.";
      const gameMeta = game?.genre || "—";
      const gameUrl = pickUrl(game);

      contentEl.innerHTML = `
        <div class="card">
          <h2>🛠️ Logiciel du jour</h2>
          <strong>${esc(softName)}</strong>
          <p>Catégorie : ${esc(softMeta)}</p>
          <a href="${esc(softUrl)}" target="_blank" rel="noopener noreferrer">⬇ Télécharger (lien officiel)</a>
        </div>

        <div class="card">
          <h2>🎮 Jeu du jour</h2>
          <strong>${esc(gameName)}</strong>
          <p>Genre : ${esc(gameMeta)}</p>
          <a href="${esc(gameUrl)}" target="_blank" rel="noopener noreferrer">⬇ Télécharger (lien officiel)</a>
        </div>
      `;
    } catch (err) {
      console.error(err);
      contentEl.textContent = `❌ Erreur de chargement : ${err?.message || err}`;
      if (dateEl) dateEl.textContent = "—";
    }
  })();
})();
