# Stasiun Tegal FPS

Browser FPS survival game berbasis **Vite + TypeScript + Three.js** dengan map procedural bertema stasiun bawah tanah: **Stasiun Tegal**.

## Fitur Utama
- First-person camera: mouse look + WASD movement
- Wave survival melawan zombie humanoid
- Boss setiap 5 wave: **Metro Butcher**
- Shooting system dengan:
  - recoil pattern
  - muzzle flash + bloom
  - bullet trail
  - hit spark + impact pulse
  - reload
- Pickup:
  - ammo
  - medkit
  - scrap
- HUD lengkap:
  - HP, ammo, wave, objective, score, scrap
  - boss health + boss phase
  - low HP warning, reload warning
  - directional damage indicator
  - hitmarker animasi
- Camera shake ringan berbasis event (shot/hit/kill/explosion)
- Audio synth event-driven (tanpa aset audio eksternal)

## Tech Stack
- TypeScript
- Three.js
- Vite

## Menjalankan Project
```bash
npm install
npm run dev
```

Build production:
```bash
npm run build
```

Preview build:
```bash
npm run preview
```

## Kontrol
- `Click` = lock cursor
- `W A S D` = gerak
- `Mouse` = aiming
- `LMB` = tembak
- `R` = reload
- `F` = restart saat mati
- `1 / 2 / 3` = ganti mode senjata

## Mode Senjata
Mode senjata dapat diganti real-time:
- `1` Ranger: stabil, presisi tinggi
- `2` Striker: impact besar, recoil lebih berat
- `3` Phantom: fire rate lebih cepat, efek visual agresif

Konfigurasi mode ada di:
- `src/game/balance/GameBalance.ts` (`weaponModes`)

## Arsitektur Singkat
Struktur modular utama:

```text
src/game/
  balance/      # tuning angka gameplay (single source of truth)
  core/         # input + player controller
  entities/     # enemy + boss
  systems/      # weapon, wave, pickup, audio
  ui/           # HUD
  world/        # procedural map builder
```

Entry point:
- `src/main.ts`
- `src/game/Game.ts`

## Balancing & Tuning
Semua tuning inti dikumpulkan di:
- `src/game/balance/GameBalance.ts`

Termasuk:
- statistik weapon
- kurva wave 1-10
- parameter enemy & boss
- pickup economy
- camera shake profile

## Catatan
- Proyek ini menggunakan geometry procedural (tanpa aset 3D eksternal).
- Audio juga procedural via Web Audio API.
