(() => {
  const base = new URL("./", window.location.href);
  const $ = (id) => document.getElementById(id);

  function url(path) { return new URL(path, base).toString(); }

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

  function pickUrl(obj) {
    return obj?.download_url || obj?.home_url || obj?.url || "#";
  }

  // ---------------- Favoris (localStorage) ----------------
  const FAV_KEY = "gl_favorites_v1";

  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
    catch { return []; }
  }
  function saveFavs(favs) { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); }

  function favId(pick) { return `${pick.date}__${pick.software_id}__${pick.game_id}`; }

  function isFav(id) { return loadFavs().some(x => x.id === id); }

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
      renderTopFav(); // refresh top
    });
    return span;
  }

  // ---------------- UI helpers ----------------
  function chip(text) {
    return `<span class="chip">${esc(text)}</span>`;
  }

  function renderPickCard(pick, soft, game, compact = false) {
    const softName = soft?.name || "Logiciel inconnu";
    const gameName = game?.name || "Jeu inconnu";

    const softUrl = pickUrl(soft);
    const gameUrl = pickUrl(game);

    const softMeta = soft?.category ? chip(`🧩 ${soft.category}`) : "";
    const gameMeta = game?.genre ? chip(`🎮 ${game.genre}`) : "";

    const wrap = document.createElement("div");
    wrap.className = "card";

    const top = document.createElement("div");
    top.className = "row";
    top.innerHTML = `<div class="pill">📅 ${esc(pick.date || "—")}</div>`;
    const right = document.createElement("div");
    right.appendChild(starEl(pick, soft, game));
    top.appendChild(right);

    wrap.appendChild(top);

    wrap.insertAdjacentHTML("beforeend", `
      <div style="margin-top:.75rem">
        <strong>🛠️ ${esc(softName)}</strong>
        ${compact ? "" : `<div class="chips">${softMeta}</div>`}
        <div style="margin-top:.5rem">
          <a class="btn primary" href="${esc(softUrl)}" target="_blank" rel="noopener noreferrer">Télécharger logiciel</a>
        </div>
      </div>

      <hr/>

      <div>
        <strong>🎮 ${esc(gameName)}</strong>
        ${compact ? "" : `<div class="chips">${gameMeta}</div>`}
        <div style="margin-top:.5rem">
          <a class="btn primary" href="${esc(gameUrl)}" target="_blank" rel="noopener noreferrer">Télécharger jeu</a>
        </div>
      </div>
    `);

    return wrap;
  }

  function matchesQuery(pick, soft, game, q, mode) {
    if (!q) return true;
    const hay = [
      pick?.date,
      soft?.name, soft?.category,
      game?.name, game?.genre
    ].filter(Boolean).join(" ").toLowerCase();

    if (mode === "software") {
      const s = [soft?.name, soft?.category].filter(Boolean).join(" ").toLowerCase();
      return s.includes(q);
    }
    if (mode === "games") {
      const g = [game?.name, game?.genre].filter(Boolean).join(" ").toLowerCase();
      return g.includes(q);
    }
    return hay.includes(q);
  }

  // ---------------- Countdown (13:30 Paris) ----------------
  function pad2(n){ return String(n).padStart(2, "0"); }

  function nextParis1330() {
    // On fait un calcul simple basé sur l'heure locale du navigateur.
    // (suffisant pour ton site statique ; pas besoin de libs)
    const now = new Date();
    const target = new Date(now);
    target.setHours(13, 30, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
  }

  function startCountdown() {
    const el = $("countdown");
    if (!el) return;

    function tick() {
      const now = new Date();
      const t = nextParis1330();
      const diff = Math.max(0, t - now);

      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      el.textContent = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
    }

    tick();
    setInterval(tick, 1000);
  }

  // ---------------- Data + Rendering ----------------
  let softById = new Map();
  let gameById = new Map();
  let todayPick = null;
  let last7Picks = [];

  function renderTopFav() {
    const box = $("topFav");
    if (!box) return;

    const favs = loadFavs();
    box.innerHTML = "";

    if (!favs.length) {
      box.innerHTML = `<div class="card">Aucun favori pour l’instant. Clique sur ☆ pour en ajouter.</div>`;
      return;
    }

    // “Top” = les 6 plus récents
    const top = favs.slice(0, 6);
    for (const f of top) {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div class="pill">⭐ Favori • ${esc(f.date)}</div>
        <div style="margin-top:.75rem"><strong>🛠️ ${esc(f.software_name || f.software_id)}</strong></div>
        <div style="margin-top:.35rem"><a class="btn primary" href="${esc(f.software_url || "#")}" target="_blank" rel="noopener noreferrer">Télécharger logiciel</a></div>
        <hr/>
        <div><strong>🎮 ${esc(f.game_name || f.game_id)}</strong></div>
        <div style="margin-top:.35rem"><a class="btn primary" href="${esc(f.game_url || "#")}" target="_blank" rel="noopener noreferrer">Télécharger jeu</a></div>
      `;
      box.appendChild(div);
    }
  }

  function renderLast7() {
    const box = $("last7");
    if (!box) return;

    const q = ($("q")?.value || "").trim().toLowerCase();
    const mode = ($("filter")?.value || "all");

    box.innerHTML = "";

    if (!last7Picks.length) {
      box.innerHTML = `<div class="card">Ajoute <code>data/catalog.json</code> pour afficher l’historique.</div>`;
      return;
    }

    const filtered = last7Picks.filter(p => {
      const s = softById.get(p.software_id);
      const g = gameById.get(p.game_id);
      return matchesQuery(p, s, g, q, mode);
    });

    if (!filtered.length) {
      box.innerHTML = `<div class="card">Aucun résultat pour ta recherche.</div>`;
      return;
    }

    for (const p of filtered) {
      const s = softById.get(p.software_id);
      const g = gameById.get(p.game_id);
      box.appendChild(renderPickCard(p, s, g, true));
    }
  }

  function bindSearch() {
    const q = $("q");
    const filter = $("filter");
    const clear = $("clear");

    if (q) q.addEventListener("input", renderLast7);
    if (filter) filter.addEventListener("change", renderLast7);
    if (clear) clear.addEventListener("click", (e) => {
      e.preventDefault();
      if (q) q.value = "";
      if (filter) filter.value = "all";
      renderLast7();
    });
  }

  (async () => {
    try {
      startCountdown();
      bindSearch();

      const [picks, softwareList, gamesList] = await Promise.all([
        loadJSON("data/picks.json"),
        loadJSON("data/software.json"),
        loadJSON("data/games.json"),
      ]);

      todayPick = Array.isArray(picks) ? picks[0] : picks;

      softById = new Map((Array.isArray(softwareList) ? softwareList : []).map(s => [s.id, s]));
      gameById = new Map((Array.isArray(gamesList) ? gamesList : []).map(g => [g.id, g]));

      if ($("pick-date")) $("pick-date").textContent = todayPick?.date || "—";

      const s = softById.get(todayPick?.software_id);
      const g = gameById.get(todayPick?.game_id);

      const todayBox = $("today");
      if (todayBox) {
        todayBox.innerHTML = "";
        todayBox.appendChild(renderPickCard(todayPick, s, g, false));
      }

      // catalog.json optionnel
      let catalog = [];
      try { catalog = await loadJSON("data/catalog.json"); } catch { catalog = []; }

      if (Array.isArray(catalog) && catalog.length) {
        const cleaned = catalog
          .filter(x => x && x.date && x.software_id && x.game_id)
          .sort((a,b) => String(b.date).localeCompare(String(a.date)));

        // 7 derniers hors aujourd'hui
        last7Picks = cleaned.filter(x => x.date !== todayPick.date).slice(0, 7);
      } else {
        last7Picks = [];
      }

      renderLast7();
      renderTopFav();
    } catch (err) {
      console.error(err);
      const msg = `❌ Erreur : ${err?.message || err}`;

      if ($("today")) $("today").innerHTML = `<div class="card">${esc(msg)}</div>`;
      if ($("last7")) $("last7").innerHTML = `<div class="card">${esc(msg)}</div>`;
      if ($("topFav")) $("topFav").innerHTML = `<div class="card">${esc(msg)}</div>`;
    }
  })();
})();
