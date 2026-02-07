(() => {
  const FAV_KEY = "gl_favorites_v1";
  const box = document.getElementById("favList");

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
    catch { return []; }
  }

  function saveFavs(favs) {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  }

  function removeFav(id) {
    const favs = loadFavs().filter(x => x.id !== id);
    saveFavs(favs);
    render();
  }

  function render() {
    const favs = loadFavs();
    box.innerHTML = "";

    if (!favs.length) {
      box.innerHTML = `<div class="card">Aucun favori pour l’instant. Retourne sur l’accueil et clique sur ☆.</div>`;
      return;
    }

    for (const f of favs) {
      const softUrl = f.software_url || "#";
      const gameUrl = f.game_url || "#";

      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div style="opacity:.85">📅 ${esc(f.date)}</div>
        <div style="margin-top:.6rem"><strong>🧩 ${esc(f.software_name || f.software_id)}</strong></div>
        <div><a href="${esc(softUrl)}" target="_blank" rel="noopener noreferrer">Télécharger logiciel</a></div>

        <div style="margin-top:.6rem"><strong>🎮 ${esc(f.game_name || f.game_id)}</strong></div>
        <div><a href="${esc(gameUrl)}" target="_blank" rel="noopener noreferrer">Télécharger jeu</a></div>

        <div style="margin-top:1rem">
          <button data-id="${esc(f.id)}" style="padding:.55rem .8rem;border-radius:10px;border:1px solid #1e293b;background:#0b1227;color:#e5e7eb;cursor:pointer">
            Retirer des favoris
          </button>
        </div>
      `;
      div.querySelector("button").addEventListener("click", () => removeFav(f.id));
      box.appendChild(div);
    }
  }

  render();
})();