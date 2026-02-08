(function () {
  const $ = (s) => document.querySelector(s);

  function toDate(d) {
    const [y, m, day] = String(d || "").split("-").map(Number);
    return new Date(y, (m || 1) - 1, day || 1, 12, 0, 0);
  }

  function formatDate(d) {
    try {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return "";
    }
  }

  function addLink(container, label, url) {
    if (!container || !url) return;
    const a = document.createElement("a");
    a.className = "link";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = label;
    container.appendChild(a);
  }

  function renderBlock(prefix, obj) {
    const title = $(`#${prefix}Title`);
    const desc = $(`#${prefix}Desc`);
    const tags = $(`#${prefix}Tags`);
    const links = $(`#${prefix}Links`);

    if (title) title.textContent = obj?.title || "—";
    if (desc) desc.textContent = obj?.shortDesc || "";

    if (tags) {
      tags.innerHTML = "";
      (obj?.tags || []).slice(0, 10).forEach((t) => {
        const s = document.createElement("span");
        s.className = "tag";
        s.textContent = t;
        tags.appendChild(s);
      });
    }

    if (links) {
      links.innerHTML = "";
      const L = obj?.links || {};
      addLink(links, "Télécharger (officiel)", L.download || L.official);
      addLink(links, "Site officiel", L.official);
      addLink(links, "Flathub", L.flathub);
      addLink(links, "Steam", L.steam);
      addLink(links, "itch.io", L.itch);
    }
  }

  function pickRandom(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${path}`);
    return await res.json();
  }

  async function pickDiscover() {
    const [picks, catalog] = await Promise.all([
      loadJSON("./data/picks.json"),
      loadJSON("./data/catalog.json"),
    ]);

    // pool: history + current (si présent)
    const pool = [];
    if (picks?.current?.date) pool.push(picks.current);
    if (Array.isArray(picks?.history)) pool.push(...picks.history);

    // si pool vide, fallback sur catalog (au hasard)
    if (pool.length === 0) {
      return {
        meta: "Catalogue",
        app: pickRandom(catalog?.apps) || null,
        game: pickRandom(catalog?.games) || null,
      };
    }

    // pool recent d'abord (max 30)
    const sorted = pool
      .filter((x) => x && x.date)
      .slice()
      .sort((a, b) => toDate(b.date) - toDate(a.date))
      .slice(0, 30);

    const chosen = pickRandom(sorted) || pickRandom(pool);

    return {
      meta: chosen?.date ? `Édition #${chosen.issue || "—"} • ${formatDate(toDate(chosen.date))}` : "Sélection",
      app: chosen?.app || null,
      game: chosen?.game || null,
    };
  }

  async function render() {
    const errBox = $("#discoverError");
    if (errBox) errBox.innerHTML = "";

    try {
      const result = await pickDiscover();
      const meta = $("#discoverMeta");
      if (meta) meta.textContent = result.meta || "Sélection au hasard";

      renderBlock("dApp", result.app);
      renderBlock("dGame", result.game);
    } catch (e) {
      const msg = String(e?.message || e);
      if (errBox) errBox.innerHTML = `<div class="danger">Erreur : ${msg}</div>`;
    }
  }

  const reroll = $("#reroll");
  if (reroll) reroll.addEventListener("click", render);

  render();
})();
