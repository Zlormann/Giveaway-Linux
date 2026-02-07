(() => {
  const base = new URL("./", window.location.href);

  const $ = (id) => document.getElementById(id);

  function url(path) {
    return new URL(path, base).toString();
  }

  async function loadJSON(path) {
    const res = await fetch(url(path), { cache: "no-store" });
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

  // --- Favoris (localStorage) ----------------------------------------------
  const FAV_KEY = "gl_favorites_v1";

  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
    catch { return []; }
  }

  function saveFavs(favs) {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  }

  function favId(pick) {
    // identifiant stable : date + ids
    return `${pick.date}__${pick.software_id}__${pick.game_id}`;
  }

  function isFav(id) {
    return loadFavs().some(x => x.id === id);
  }

  function toggleFav(pick, soft, game) {
    const id = favId(pick);
    const favs = loadFavs();
    const idx = favs.findIndex(x => x.id === id);
    if (idx >= 0) {
      favs.splice(idx, 1);
      saveFavs(favs);
      return false;
    }
    favs.unshift({
      id,
      date: pick.date,
      software_id: pick.software_id,
      game_id: pick.game_id,
      software_name: soft?.name || "",
      game_name: game?.name || "",
      software_url: soft?.url || "",
      game_url: game?.url || "",
      saved_at: new Date().toISOString()
    });
    // limite à 200 favoris
    saveFavs(favs.slice(0, 200));
    return true;
  }

  function starEl(pick, soft, game) {
    const id = favId(pick);
    const span = document.createElement("span");
    span.className = "star" + (isFav(id) ? " on" : "");
    span.title = "Ajouter/retirer des favoris";
    span.textContent = isFav(id) ? "★" : "☆";
    span.addEventListener("click", () => {
      const on = toggleFav(pick, soft, game);
      span.className = "star" + (on ? " on" : "");
      span.textContent = on ? "★" : "☆";
    });
    return span;
  }

  // --- Render ---------------------------------------------------------------
  function pickUrl(obj) {
    return obj?.download_url || obj?.home_url || obj?.url || "#";
  }

  function renderPickCard(pick, soft, game, compact = false) {
    const softName = soft?.name || "Logiciel inconnu";
    const gameName = game?.name || "Jeu inconnu";

    const softMeta = soft?.category ? `Catégorie : ${esc(soft.category)}` : "";
    const gameMeta = game?.genre ? `Genre : ${esc(game.genre)}` : "";

    const softUrl = pickUrl(soft);
    const gameUrl = pickUrl(game);

    const wrap = document.createElement("div");
    wrap.className = "card";

    const top = document.createElement("div");
    top.className = "row";

    const left = document.createElement("div");
    left.innerHTML = `<div class="pill">📅 ${esc(pick.date || "—")}</div>`;

    const right = document.createElement("div");
    right.appendChild(starEl(pick, soft, game));

    top.appendChild(left);
    top.appendChild(right);

    const html = `
      <div style="margin-top:.75rem">
        <strong>🧩 ${esc(softName)}</strong>
        ${compact ? "" : `<div class="muted mini">${softMeta}</div>`}
        <div style="margin-top:.4rem"><a class="btn" href="${esc(softUrl)}" target="_blank" rel="noopener noreferrer">Télécharger logiciel</a></div>
      </div>

      <hr style="border:none;border-top:1px solid #1e293b;margin:1rem 0" />

      <div>
        <strong>🎮 ${esc(gameName)}</strong>
        ${compact ? "" : `<div class="muted mini">${gameMeta}</div>`}
        <div style="margin-top:.4rem"><a class="btn" href="${esc(gameUrl)}" target="_blank" rel="noopener noreferrer">Télécharger jeu</a></div>
      </div>
    `;

    wrap.appendChild(top);
    wrap.insertAdjacentHTML("beforeend", html);
    return wrap;
  }

  function byDateDesc(a, b) {
    return String(b.date).localeCompare(String(a.date));
  }

  // --- Main ----------------------------------------------------------------
  (async () => {
    try {
      const [todayPick, softwareList, gamesList] = await Promise.all([
        loadJSON("data/picks.json"),
        loadJSON("data/software.json"),
        loadJSON("data/games.json"),
      ]);

      // catalog (historique) optionnel mais nécessaire pour "7 derniers jours"
      let catalog = [];
      try {
        catalog = await loadJSON("data/catalog.json");
      } catch {
        catalog = [];
      }

      const softById = new Map((Array.isArray(softwareList) ? softwareList : []).map(s => [s.id, s]));
      const gameById = new Map((Array.isArray(gamesList) ? gamesList : []).map(g => [g.id, g]));

      // --- Aujourd'hui
      const pick = Array.isArray(todayPick) ? todayPick[0] : todayPick;
      if ($("pick-date")) $("pick-date").textContent = pick?.date || "—";

      const soft = softById.get(pick?.software_id);
      const game = gameById.get(pick?.game_id);

      const todayBox = $("today");
      todayBox.innerHTML = "";
      todayBox.appendChild(renderPickCard(pick, soft, game));

      // --- 7 derniers jours (depuis catalog.json)
      const last7Box = $("last7");
      last7Box.innerHTML = "";

      if (!Array.isArray(catalog) || catalog.length === 0) {
        last7Box.innerHTML = `<div class="card">Ajoute <code>data/catalog.json</code> pour afficher l’historique (7 derniers jours).</div>`;
        return;
      }

      // on enlève la date du jour si elle est déjà dans catalog
      const filtered = catalog
        .filter(x => x && x.date && x.software_id && x.game_id)
        .sort(byDateDesc);

      // 7 derniers (hors aujourd'hui si présent)
      const last = filtered.filter(x => x.date !== pick.date).slice(0, 7);

      if (last.length === 0) {
        last7Box.innerHTML = `<div class="card">Historique vide (ou uniquement aujourd’hui).</div>`;
        return;
      }

      for (const p of last) {
        const s = softById.get(p.software_id);
        const g = gameById.get(p.game_id);
        last7Box.appendChild(renderPickCard(p, s, g, true));
      }
    } catch (err) {
      console.error(err);
      const todayBox = $("today");
      if (todayBox) todayBox.innerHTML = `<div class="card">❌ Erreur : ${esc(err.message || err)}</div>`;
      const last7Box = $("last7");
      if (last7Box) last7Box.innerHTML = `<div class="card">❌ Erreur : ${esc(err.message || err)}</div>`;
    }
  })();
})();
