# Tuldep (Tool Developer)

Tuldep adalah dev tool lokal untuk memudahkan developer manage banyak project
sekaligus — konsepnya mirip "Docker Desktop" untuk process management, plus
shortcut untuk menjalankan script database (PostgreSQL & MongoDB) tanpa perlu
ingat command manual tiap kali.

Ini **bukan** aplikasi production/multi-user. Single-user, jalan lokal di
mesin developer masing-masing. Jangan tambahkan kompleksitas auth, rate
limiting, atau concurrent-write handling yang berlebihan — prioritas selalu
kesederhanaan dan kecepatan iterasi.

## Tech Stack

- **Runtime**: Bun
- **Backend**: Hono (REST API + WebSocket via `hono/bun`)
- **Frontend**: React + Vite + TypeScript
- **Database**: SQLite (`bun:sqlite`, built-in, tanpa dependency tambahan)
- **Monorepo**: Bun workspaces

## Struktur Project

```
tuldep/
├── apps/
│   ├── server/      # Bun + Hono — process manager, DB runner, API
│   └── web/         # React — UI
├── packages/
│   └── shared/      # Types & Zod schema bersama (@tuldep/shared)
└── data/
    ├── tuldep.db     # SQLite
    └── logs/         # Log file per project ({projectId}.log)
```

> ⚠️ **Verifikasi**: struktur ini adalah rencana awal. Kalau ada penamaan file
> atau folder yang sudah berubah selama development, update bagian ini duluan
> sebelum bagian lain — ini jadi peta utama buat sesi Claude berikutnya.

## Domain Model Inti

Didefinisikan di `packages/shared/src` sebagai Zod schema + TypeScript types.

- **Project** — `{ id, name, cwd, command, env, port?, engine?, createdAt }`
  - `command` disimpan sebagai **string command final** (hasil resolve dari
    pilihan script `package.json` atau custom command), bukan reference ke
    nama script. Jangan ubah pola ini di `processManager.ts` tanpa alasan kuat.
  - `engine` opsional: `{ type: 'node' | 'php', path, version } | null`. Kalau
    null, proses jalan pakai PATH sistem apa adanya (behaviour default).
  - `port` opsional, dipakai untuk quick-link `http://localhost:{port}` di UI.
- **DbConnection** — `{ id, name, kind: 'postgres' | 'mongodb', connectionString, createdAt }`
- **DbScript** — `{ id, name, connectionId, kind, payload, createdAt }`
  - ⚠️ Field `action` (`seed`/`reset`/`migrate`/`custom`) **sudah dihapus**.
    Jangan tambahkan lagi — keputusan sadar karena terlalu membatasi.
    Konsekuensinya: **semua** run script sekarang selalu minta confirm
    dialog di UI (karena tidak ada cara tahu mana yang destructive).
  - Payload untuk `postgres` = raw SQL string. Untuk `mongodb` = JSON string
    `{ collection, operation, data }`.

## Konvensi Penting (jangan dilanggar tanpa alasan)

1. **DB driver native, bukan shell out.** Postgres pakai package `postgres`
   (porsager), MongoDB pakai driver official `mongodb`. Jangan spawn
   `psql`/`mongosh` — alasannya supaya user tidak perlu install CLI tambahan
   dan error handling-nya structured.
2. **Destructive action selalu perlu confirm.** Endpoint run script terima
   `{ confirmed: boolean }`, return 400 kalau belum `true`. Ini berlaku
   untuk **semua** script sejak field `action` dihapus.
3. **Reuse form component dengan mode `'create' | 'edit'`.** Sudah dipakai
   konsisten untuk Project, Connection, dan Script. Jangan bikin form
   terpisah untuk edit — cek pola yang sudah ada dulu sebelum nambah form baru.
4. **Loading state per-item, bukan global.** Start project / run script pakai
   state loading per-id (`Set<id>` atau `Record<id, boolean>`), supaya
   beberapa aksi bisa jalan bersamaan tanpa saling block UI. Jangan pakai
   satu boolean loading global untuk aksi berulang seperti ini.
5. **Export/import config pakai nama sebagai reference key**, bukan id —
   karena id lokal tidak akan match di mesin developer lain. `DbScript`
   di file export reference `connectionName`, bukan `connectionId`. Saat
   import: connections diproses dulu sebelum scripts.
6. **Config lokal (connection string dsb.) tidak dienkripsi.** Ini keputusan
   sadar untuk kesederhanaan MVP single-user. Kalau suatu saat perlu
   encryption, itu perubahan besar — diskusikan dulu, jangan diam-diam
   ditambahkan.
7. **Auto-discover tidak pernah auto-import.** Hasil scan folder selalu
   berupa suggestion yang perlu dikonfirmasi user secara eksplisit (checkbox
   + tombol "Import Selected"), termasuk kesempatan koreksi command sebelum
   masuk database.
8. **Project running tidak auto-apply saat config di-edit.** Kalau project
   sedang jalan lalu config-nya diubah (command, engine, dsb), proses lama
   tetap jalan dengan config lama. User perlu restart manual. UI harus kasih
   notice soal ini setelah save.

## Fitur yang Sudah Ada

- [x] Process manager: start/stop project, real-time log streaming (WebSocket),
      auto-detect crash, log persisted ke file + in-memory ring buffer
- [x] Clear log per project (tidak mempengaruhi proses yang sedang jalan)
- [x] DB script runner (Postgres & MongoDB) dengan history run per script
- [x] Auto-discover project dari folder (deteksi `package.json` node/bun dan
      Laravel `artisan` + `composer.json`), dengan command suggestion yang
      bisa dikoreksi sebelum import
- [x] Edit config: Project, DB Connection, DB Script (form reusable
      create/edit)
- [x] Selectable run command dari `scripts` di `package.json` (real-time
      fetch) + opsi custom command manual
- [x] Export/import config (Connections + Scripts) dalam bentuk file,
      2-step (preview → resolve conflict → apply)
- [x] Engine selection per project (pilih versi Node/PHP dari yang
      terinstall lokal — nvm/fnm/volta untuk Node, phpbrew/homebrew/system
      untuk PHP — atau custom path manual)
- [x] Port label per project + quick link `http://localhost:{port}`
- [x] My IP (proxy ke `ipinfo.io/json` lewat backend, dengan cache singkat)
- [x] UI full-width, design system ter-refine (lihat bagian Design System
      di bawah)

> ⚠️ **Verifikasi**: format export/import config di rencana awal pakai JSON
> murni. Kalau kamu sudah pindah ke YAML atau format lain untuk mengatasi
> masalah multiline SQL, **update bagian ini** dan sebutkan format final
> yang dipakai, termasuk nama package parser-nya.

## Design System

> ⚠️ **Isi bagian ini manual** setelah proses refine UI selesai — minta
> Claude Code untuk ringkas token yang dipakai (color palette + alasan,
> typeface + alasan) lalu tempel di sini. Ini penting supaya fitur baru ke
> depan otomatis konsisten tanpa perlu re-jelaskan brief desain tiap sesi.

```
Color:
Type:
Layout principles:
```

## API Pattern

Semua route di `apps/server/src`, prefix `/api/*` untuk REST, `/ws/*` untuk
WebSocket. Pola CRUD yang konsisten dipakai untuk Project, DbConnection,
DbScript — kalau nambah entity baru, ikuti pola `GET list / POST create /
PUT :id / DELETE :id` yang sama.

CORS di-enable untuk dev (`localhost:5173`). Kalau web di-hosting terpisah
dari backend lokal (lihat catatan di bawah), origin perlu disesuaikan.

## Cara Jalanin (dev)

```bash
# Dari root — jalanin server + web bareng (satu terminal)
bun run dev
```

Root script ini pakai fitur native Bun workspaces filter
(`bun run --filter "*" dev`), bukan `concurrently`/`turbo` — keputusan
sadar biar gak nambah dependency, konsisten dengan filosofi "Bun-only".
`packages/shared` gak punya script `dev` jadi otomatis di-skip oleh
filter, cuma `apps/server` dan `apps/web` yang jalan.

Atau manual per-app kalau cuma butuh salah satu:

```bash
# Server saja
cd apps/server && bun run dev

# Web saja
cd apps/web && bun run dev
```

> ⚠️ **Verifikasi**: sesuaikan command di atas kalau script `dev` di
> `package.json` masing-masing app namanya beda.

## Hal yang Sengaja Belum Dikerjakan (jangan asumsikan sudah ada)

- Auto-restart project saat crash
- Packaging jadi desktop app (kandidat: Tauri)
- Auth / multi-user
- Auto-detect port dari log output (saat ini port murni manual input)
- Encryption untuk connection string

## Catatan Arsitektur Lain

- Web di-hosting terpisah dari backend memungkinkan (backend tetap jalan di
  `localhost` mesin masing-masing developer), tapi perlu perhatikan mixed
  content policy (HTTPS page → `http://localhost`) dan CORS. Kalau ini
  akhirnya diimplementasikan, dokumentasikan solusinya di sini.