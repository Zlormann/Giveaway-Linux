(async () => {
  const el = document.getElementById("archive");

  try {
    const res = await fetch("data/catalog.json", { cache: "no-store" });
    const data = await res.json();

    el.innerHTML = data.map(item => `
      <div class="card">
        <strong>${item.date}</strong><br>
        🛠️ <a href="${item.software_url}" target="_blank">Télécharger ${item.software}</a><br>
        🎮 <a href="${item.game_url}" target="_blank">Télécharger ${item.game}</a>
      </div>
    `).join("");
  } catch {
    el.textContent = "Impossible de charger les archives.";
  }
})();