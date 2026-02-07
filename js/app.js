(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const BASE = new URL("./", window.location.href);

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadJSON(path) {
    const u = new URL(path, BASE).toString();
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${path}`);
    const text = await res.text();

    // Validation JSON côté JS
    try {
      return JSON.parse(text);
    } catch (e) {
      const preview = text.slice(0, 220).replace(/\s+/g, " ");
      throw new Error(`JSON invalide dans ${path}. Détails: ${e.message}. Aperçu: "${preview}"`);
    }
  }

  function pickUrl(obj) {
    return obj?.download_url || obj?.home_url || obj?.url || "#";
  }

  function toDateISO(iso) {
    const [y,m,d] = String(iso).split("-").map(n => parseInt(n,10));
    return new Date(y, (m||1)-1, d||1, 12, 0, 0);
  }

  function formatDate(iso) {
    const d = toDateISO(iso);
    return d.toLocaleDateString(undefined, { year:"numeric", month:"long", day:"2-digit" });
  }

  // Favoris localStorage
  const FAV_KEY = "gl_favs_v1";
  function loadFavs(){
    try{
      const v = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return Array.isArray(v) ? v : [];
    }catch{ return []; }
  }
  function saveFavs(arr){
    localStorage.setItem(FAV_KEY, JSON.stringify(arr.slice(0,200)));
  }
  function favId(type, id){ return `${type}:${id}`; }
  function isFav(type, id){
    return loadFavs().includes(favId(type,id));
  }
  function toggleFav(type, id){
    const key = favId(type,id);
    const favs = loadFavs();
    const idx = favs.indexOf(key);
    if(idx >= 0) favs.splice(idx,1);
    else favs.unshift(key);
    saveFavs(favs);
    return favs.includes(key);
  }

  function renderCard({date, software, game, showStar=true}) {
    const softName = software?.name || "Aucun logiciel trouvé.";
    const softMeta = software?.category || "—";
    const softUrl = pickUrl(software);

    const gameName = game?.name || "Aucun jeu trouvé.";
    const gameMeta = game?.genre || "—";
    const gameUrl = pickUrl(game);

    const softwareId = software?.id || "";
    const gameId = game?.id || "";

    const softStarOn = softwareId ? isFav("software", softwareId) : false;
    const gameStarOn = gameId ? isFav("game", gameId) : false;

    const starBtn = (kind, id, on) => {
      if(!showStar || !id) return "";
      return `<button class="starBtn ${on ? "on":""}" data-star="${esc(kind)}" data-id="${esc(id)}" title="Favori">⭐</button>`;
    };

    return `
      <article class="card" data-date="${esc(date)}">
        <div class="inner">
          <div class="muted" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <div>📅 <b>${esc(formatDate(date))}</b></div>
            <div class="muted">Sélection</div>
          </div>

          <div class="hr"></div>

          <div style="position:relative;">
            ${starBtn("software", softwareId, softStarOn)}
            <div class="muted"><b>🛠 Logiciel</b></div>
            <h3 style="margin:6px 0 4px;">${esc(softName)}</h3>
            <div class="tags" style="margin-top:8px;">
              <span class="tag">${esc(softMeta)}</span>
            </div>
            <div class="links">
              <a class="link" href="${esc(softUrl)}" target="_blank" rel="noopener">⬇ Télécharger logiciel</a>
            </div>
          </div>

          <div class="hr"></div>

          <div style="position:relative;">
            ${starBtn("game", gameId, gameStarOn)}
            <div class="muted"><b>🎮 Jeu</b></div>
            <h3 style="margin:6px 0 4px;">${esc(gameName)}</h3>
            <div class="tags" style="margin-top:8px;">
              <span class="tag">${esc(gameMeta)}</span>
            </div>
            <div class="links">
              <a class="link" href="${esc(gameUrl)}" target="_blank" rel="noopener">⬇ Télécharger jeu</a>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function bindStarButtons(root=document){
    $$("[data-star]", root).forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const kind = btn.getAttribute("data-star");
        const id = btn.getAttribute("data-id");
        const on = toggleFav(kind, id);
        btn.classList.toggle("on", on);
        renderFavoritesSection(window.__GL_DATA__);
      });
    });
  }

  function startCountdown(el){
    if(!el) return;
    function nextTargetUTC(){
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = now.getUTCMonth();
      const d = now.getUTCDate();

      const t1 = new Date(Date.UTC(y,m,d,11,30,0));
      const t2 = new Date(Date.UTC(y,m,d,12,30,0));

      if(now < t1) return t1;
      if(now < t2) return t2;
      return new Date(Date.UTC(y,m,d+1,11,30,0));
    }

    function tick(){
      const target = nextTargetUTC();
      const ms = target - new Date();
      const s = Math.max(0, Math.floor(ms/1000));
      const hh = String(Math.floor(s/3600)).padStart(2,"0");
      const mm = String(Math.floor((s%3600)/60)).padStart(2,"0");
      const ss = String(s%60).padStart(2,"0");
      el.textContent = `${hh}:${mm}:${ss}`;
    }

    tick();
    setInterval(tick, 1000);
  }

  function findById(list, id){
    if(!Array.isArray(list)) return null;
    return list.find(x => x && x.id === id) || null;
  }

  function getLastNDays(history, n=7){
    if(!Array.isArray(history)) return [];
    return history.slice(0, n);
  }

  function renderToday(data){
    const box = $("#todayBox");
    if(!box) return;

    const pick = data.pick;
    const software = findById(data.softwareList, pick?.software_id);
    const game = findById(data.gamesList, pick?.game_id);

    if(!pick || !pick.date){
      box.innerHTML = `<div class="danger">❌ picks.json invalide ou vide.</div>`;
      return;
    }

    box.innerHTML = renderCard({date: pick.date, software, game, showStar:true});
    bindStarButtons(box);
  }

  function renderLast7(data){
    const box = $("#last7Box");
    if(!box) return;

    const history = data.history;
    if(!Array.isArray(history) || history.length === 0){
      box.innerHTML = `<div class="note">Ajoute <b>data/history.json</b> (auto-généré) pour afficher l'historique.</div>`;
      return;
    }

    const q = (data.ui.q || "").trim().toLowerCase();
    const type = data.ui.type || "all";

    const items = getLastNDays(history, 7).map(h=>{
      const software = findById(data.softwareList, h.software_id);
      const game = findById(data.gamesList, h.game_id);
      return {h, software, game};
    });

    const filtered = items.filter(({h, software, game})=>{
      const softName = (software?.name || "").toLowerCase();
      const gameName = (game?.name || "").toLowerCase();

      const hit = !q || softName.includes(q) || gameName.includes(q) || String(h.software_id||"").includes(q) || String(h.game_id||"").includes(q);

      if(!hit) return false;
      if(type === "software") return softName.includes(q) || String(h.software_id||"").includes(q) || !q;
      if(type === "game") return gameName.includes(q) || String(h.game_id||"").includes(q) || !q;
      return true;
    });

    if(filtered.length === 0){
      box.innerHTML = `<div class="note">Aucun résultat dans les 7 derniers jours.</div>`;
      return;
    }

    box.innerHTML = filtered.map(({h, software, game}) => renderCard({date: h.date, software, game, showStar:true})).join("");
    bindStarButtons(box);
  }

  function renderFavoritesSection(data){
    const box = $("#favBox");
    const page = $("#favoritesPage");
    const target = box || page;
    if(!target) return;

    const favs = loadFavs();
    if(favs.length === 0){
      target.innerHTML = `<div class="note">Aucun favori pour l'instant. Clique sur ⭐ pour en ajouter.</div>`;
      return;
    }

    const items = favs.map(key=>{
      const [type,id] = key.split(":");
      if(type === "software"){
        const software = findById(data.softwareList, id);
        return software ? {type, software} : null;
      }
      if(type === "game"){
        const game = findById(data.gamesList, id);
        return game ? {type, game} : null;
      }
      return null;
    }).filter(Boolean);

    if(items.length === 0){
      target.innerHTML = `<div class="note">Favoris introuvables (IDs supprimés).</div>`;
      return;
    }

    const html = items.map(it=>{
      if(it.type === "software"){
        const s = it.software;
        const url = pickUrl(s);
        return `
          <article class="card">
            <div class="inner">
              <button class="starBtn on" data-star="software" data-id="${esc(s.id)}" title="Retirer">⭐</button>
              <div class="muted"><b>🛠 Logiciel</b></div>
              <h3 style="margin:6px 0 4px;">${esc(s.name)}</h3>
              <div class="tags"><span class="tag">${esc(s.category || "—")}</span></div>
              <div class="links"><a class="link" href="${esc(url)}" target="_blank" rel="noopener">⬇ Télécharger logiciel</a></div>
            </div>
          </article>
        `;
      } else {
        const g = it.game;
        const url = pickUrl(g);
        return `
          <article class="card">
            <div class="inner">
              <button class="starBtn on" data-star="game" data-id="${esc(g.id)}" title="Retirer">⭐</button>
              <div class="muted"><b>🎮 Jeu</b></div>
              <h3 style="margin:6px 0 4px;">${esc(g.name)}</h3>
              <div class="tags"><span class="tag">${esc(g.genre || "—")}</span></div>
              <div class="links"><a class="link" href="${esc(url)}" target="_blank" rel="noopener">⬇ Télécharger jeu</a></div>
            </div>
          </article>
        `;
      }
    }).join("");

    target.innerHTML = html;
    bindStarButtons(target);
  }

  function renderArchiveAll(data){
    const box = $("#archiveAll");
    if(!box) return;
    const history = data.history;
    if(!Array.isArray(history) || history.length === 0){
      box.innerHTML = `<div class="note">Aucune archive pour le moment (history.json vide).</div>`;
      return;
    }
    const html = history.map(h=>{
      const software = findById(data.softwareList, h.software_id);
      const game = findById(data.gamesList, h.game_id);
      return renderCard({date: h.date, software, game, showStar:true});
    }).join("");
    box.innerHTML = html;
    bindStarButtons(box);
  }

  async function init(){
    const data = {
      pick: null,
      history: [],
      softwareList: [],
      gamesList: [],
      ui: { q:"", type:"all" },
    };

    try{
      const [pick, softwareList, gamesList] = await Promise.all([
        loadJSON("data/picks.json"),
        loadJSON("data/software.json"),
        loadJSON("data/games.json"),
      ]);
      data.pick = pick;
      data.softwareList = Array.isArray(softwareList) ? softwareList : [];
      data.gamesList = Array.isArray(gamesList) ? gamesList : [];

      try{
        const history = await loadJSON("data/history.json");
        data.history = Array.isArray(history) ? history : [];
      }catch{
        data.history = [];
      }

      window.__GL_DATA__ = data;

      startCountdown($("#countdown"));

      const q = $("#q");
      const type = $("#type");
      const clear = $("#clear");

      if(q){
        q.addEventListener("input", ()=>{
          data.ui.q = q.value || "";
          renderLast7(data);
        });
      }
      if(type){
        type.addEventListener("change", ()=>{
          data.ui.type = type.value || "all";
          renderLast7(data);
        });
      }
      if(clear){
        clear.addEventListener("click", ()=>{
          if(q) q.value = "";
          if(type) type.value = "all";
          data.ui.q = "";
          data.ui.type = "all";
          renderLast7(data);
        });
      }

      renderToday(data);
      renderLast7(data);
      renderFavoritesSection(data);
      renderArchiveAll(data);

    }catch(err){
      const msg = `<div class="danger">❌ Erreur : ${esc(err.message || String(err))}</div>`;
      const today = $("#todayBox");
      const last7 = $("#last7Box");
      const fav = $("#favBox");
      const arch = $("#archiveAll");
      if(today) today.innerHTML = msg;
      if(last7) last7.innerHTML = msg;
      if(fav) fav.innerHTML = msg;
      if(arch) arch.innerHTML = msg;
      console.error(err);
    }
  }

  init();
})();
