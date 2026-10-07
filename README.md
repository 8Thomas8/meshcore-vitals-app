# MeshCore Vitals

Check which repeaters hear you and how good each link is, from where you stand.

[![CI](https://github.com/8Thomas8/meshcore-vitals-app/actions/workflows/ci.yml/badge.svg)](https://github.com/8Thomas8/meshcore-vitals-app/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Nuxt 4](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)
![Reka UI 2](https://img.shields.io/badge/Reka_UI-2-10B981?logo=vuedotjs&logoColor=white)
![Web Bluetooth](https://img.shields.io/badge/Web_Bluetooth-0082FC?logo=bluetooth&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white)

<p align="center">
  <img src="docs/screenshot-desktop.png" alt="Desktop layout" width="100%">
</p>

<p align="center">
  <img src="docs/screenshot.png" alt="Repeaters map" width="31%">
  <img src="docs/screenshot-history.png" alt="Session history" width="31%">
  <img src="docs/screenshot-companion.png" alt="Companion page" width="31%">
</p>

## What it does

The app connects to a MeshCore companion over Bluetooth from the browser. Press Scan and the repeaters in range answer with how well they hear you. You get the signal both ways, a coverage score and a map with every repeater, direct or relayed, or a full screen list. Open a repeater for its link margin, signal over time and the terrain profile between you.

The auto scan switch scans again every minute, and the stay awake switch keeps the screen on. If the Bluetooth link drops, the app keeps the page and reconnects.

The Companion page puts the battery, link margin and noise floor up top, then the radio settings, traffic, device details and a few health checks.

The History page (beta) keeps your last 20 sessions: the route you walked colored by coverage, and the best signal of each repeater heard.

Works on a phone or a desktop and can be installed as an app. English and French.

## Requirements

- A MeshCore companion radio with Bluetooth and a recent firmware
- Chrome or Edge on desktop or Android, or the Bluefy browser on iOS (Firefox and Safari have no Web Bluetooth)
- Location access for the map

## Releases

Commits follow Conventional Commits. release-please opens a release PR on `master`, and merging it tags the version and deploys the site to Vercel.

## Contributing

Bug or feature idea? Open an issue.

To work on the code, fork the repository and create a branch, then:

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000 (Node 24, see `.nvmrc`). Before opening a pull request against `master`, check that `pnpm lint`, `pnpm typecheck` and `pnpm test` pass. Use Conventional Commits for the PR title (`feat: ...`, `fix: ...`). `pnpm build` outputs the static site.

## Privacy

The app has no backend. It counts visits with Vercel Web Analytics, which sets no cookie and only sees the page, the referrer, the country and the browser, never your radio or your location. Otherwise it only loads map tiles from OpenFreeMap, fonts from Google Fonts, and ground elevation from Open-Meteo (repeater positions, yours when the GPS gives no altitude, and the path to a repeater whose terrain profile you open). The session history, with your positions at each scan, stays in your browser and is never sent anywhere.

## License

MIT
