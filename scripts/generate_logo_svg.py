from pathlib import Path

OUT = Path("giveaway-linux/assets/logo-giveaway-linux.svg")
OUT.parent.mkdir(parents=True, exist_ok=True)

PROJECT = "Giveaway Linux"
TAGLINE = "Daily free picks • 1 app + 1 game • Open-source & community-driven"

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="820" height="220" viewBox="0 0 820 220">
  <defs>
    <linearGradient id="bg" x1="0" x2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" x2="1">
      <stop offset="0" stop-color="#22c55e"/>
      <stop offset="1" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="820" height="220" rx="22" fill="url(#bg)"/>
  <g transform="translate(56,46)">
    <rect x="0" y="0" width="128" height="128" rx="28" fill="#0f172a" stroke="url(#accent)" stroke-width="3"/>
    <g transform="translate(22,28)">
      <rect x="10" y="44" width="64" height="48" rx="10" fill="#111827" stroke="#1f2937" stroke-width="2"/>
      <rect x="10" y="44" width="64" height="16" rx="8" fill="url(#accent)" opacity="0.9"/>
      <rect x="40" y="44" width="8" height="48" fill="url(#accent)" opacity="0.9"/>
      <path d="M40 44 C28 34, 22 26, 26 20 C30 14, 42 18, 44 30 C46 18, 58 14, 62 20 C66 26, 60 34, 48 44"
            fill="none" stroke="url(#accent)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>

  <g transform="translate(210,78)">
    <text x="0" y="0" font-family="Inter,Segoe UI,Roboto,Arial,sans-serif" font-size="44" font-weight="800" fill="#e5e7eb">
      {PROJECT.split()[0]} <tspan fill="url(#accent)">{PROJECT.split()[1]}</tspan>
    </text>
    <text x="2" y="46" font-family="Inter,Segoe UI,Roboto,Arial,sans-serif" font-size="18" fill="#9ca3af">
      {TAGLINE}
    </text>
  </g>
</svg>
'''

OUT.write_text(svg, encoding="utf-8")
print(f"✅ Logo généré: {OUT}")
