# MUDU Local-First App (Flow-Aligned UX + Bun Server Scaffold)

The app now follows your 01-11 UX inventory structure directly.

## Frontend

- React + TypeScript + Vite
- Route map mirrors your sections:
  - `/flow/onboarding`
  - `/flow/home`
  - `/flow/exam-creation`
  - `/flow/question-bank`
  - `/flow/roster`
  - `/flow/launch-monitor`
  - `/flow/student-interface`
  - `/flow/results`
  - `/flow/cloud-sync`
  - `/flow/settings`
  - `/flow/global-states`

Each section screen includes the explicit Screen/Modal/Menu/Toast inventory and key prototype blocks.

## Design Direction Update

- Reduced stroke-heavy styling.
- Visual hierarchy now relies more on spacing, soft surfaces, and shadow depth.
- Borders are used sparingly for utility (focus, data separators, alerts).

## Backend (Local WiFi Exam Model)

Students connect from browser using lecturer LAN address:

`http://<lecturer-local-ip>:3000`

- Bun server binds to `0.0.0.0`.
- `/api/network` returns live `joinUrl`.
- SQLite local database persists roster/exam/session data.

## Run

```bash
cmd /c npm install
cmd /c npm run dev
cmd /c npm run build
```

Bun (absolute path from current machine install):

```bash
"C:\Users\ogwuo\AppData\Local\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe" run server/seed.ts
"C:\Users\ogwuo\AppData\Local\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64\bun.exe" run server/index.ts
```

Useful checks:
- `http://localhost:3000/api/health`
- `http://localhost:3000/api/network`
- `http://localhost:3000/api/dashboard`
