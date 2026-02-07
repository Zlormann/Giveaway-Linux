(() => {
  const contentEl = document.getElementById("content");
  if (!contentEl) return;

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
    // on prend url (ton format actuel), sinon home_url/download_url si tu ajoutes plus tard
    return obj?.url || obj?.home_url || obj?.download_url || "#";
  }

  (async () => {
    try {
      // IMPORTANT : ici on charge TES fichiers existants
      const [pick, softwareList, gamesList] = await Promise.all([
        loadJSON("data/picks.json"),
        loadJSON("data/software.json"),
        loadJSON("data/games.json"),
      ]);

      const software = Array.isArray(softwareList)
        ? softwareList.find(s => s.id === pick.software_id)
        : null;

      const game = Array.isArray(gamesList)
        ? gamesList.find(g => g.id === pick.game_id)
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
          <a href="${esc(softUrl)}" target="_blank" rel="noopener">⬇ Télécharger (lien officiel)</a>
        </div>

        <div class="card">
          <h2>🎮 Jeu du jour</h2>
          <strong>${esc(gameName)}</strong>
          <p>Genre : ${esc(gameMeta)}</p>
          <a href="${esc(gameUrl)}" target="_blank" rel="noopener">⬇ Télécharger (lien officiel)</a>
        </div>
      `;
    } catch (err) {
      console.error(err);
      contentEl.textContent = `❌ Erreur de chargement : ${err.message}`;
    }
  })();
})();