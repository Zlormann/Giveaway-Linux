const $ = (s) => document.querySelector(s);

/* =========================
   Utils
========================= */
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function card(title, desc, links = []) {
  return `
    <article class="card">
      <div class="inner">
        <h3>${title}</h3>
        <div class="muted">${desc || ""}</div>
        <div class="links">
          ${links
            .map(
              (l) =>
                `<a class="link" href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`
            )
            .join("")}
        </div>
      </div>
    </article>
  `;
}

/* =========================
   Chargement JSON sécurisé
========================= */
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Erreur chargement ${path}`);
  return res.json();
}

/* =========================
   Recherche instantanée
========================= */
function enableSearch(catalog) {
  const input = $("#searchInput");
  const results = $("#searchResults");

  if (!input || !results) return;

  const index = [
    ...catalog.apps.map((a) => ({ type: "Logiciel", ...a })),
    ...catalog.games.map((g) => ({ type: "Jeu", ...g })),
  ];

  input.addEventListener("input", () => {
    const q = normalize(input.value);
    results.innerHTML = "";

    if (!q || q.length < 2) return;

    const found = index.filter((item) => {
      const hay = normalize(
        `${item.title} ${item.shortDesc} ${(item.tags || []).join(" ")}`
      );
      return hay.includes(q);
    });

    if (found.length === 0) {
      results.innerHTML = `<div class="note">Aucun résultat.</div>`;
      return;
    }

    found.slice(0, 12).forEach((item) => {
      const links = [];
      if (item.links?.download)
        links.push({ label: "Télécharger", url: item.links.download });
      if (item.links?.official)
        links.push({ label: "Site officiel", url: item.links.official });
      if (item.links?.flathub)
        links.push({ label: "Flathub", url: item.links.flathub });
      if (item.links?.steam)
        links.push({ label: "Steam", url: item.links.steam });

      results.insertAdjacentHTML(
        "beforeend",
        card(
          `${item.type} • ${item.title}`,
          item.shortDesc,
          links
        )
      );
    });
  });
}

/* =========================
   Init global
========================= */
(async function init() {
  try {
    const catalog = await loadJSON("./data/catalog.json");
    enableSearch(catalog);
  } catch (e) {
    console.error(e);
  }
})();
