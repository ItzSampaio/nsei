# NEXUS OS 6.0

NEXUS OS is a polished desktop-style environment built with vanilla HTML, CSS, JavaScript, and Electron. It runs locally in a browser or as a packaged Windows desktop application.

## Highlights

- **NEXUS Store** - local app catalogue with search, installation state, enable/disable controls, updates, and history.
- **NEXUS Spotlight** - universal search for apps, settings, notes, documents, bookmarks, recent searches, and calculations.
- **Desktop Widgets** - persistent clock, calendar, weather status, CPU/RAM availability, battery, music, notes, and uptime widgets.
- **Snap Layouts** - edge snapping, halves, top/bottom, four corners, three columns, and saved custom layouts.
- **Live Wallpapers** - built-in animated wallpapers and local image/video imports with reduced-motion support.
- **NEXUS Recovery** - validated, versioned backups with selective restore and safety-backup export.

## Included applications

Terminal, Calculator, File Explorer, Settings, Notes, About NEXUS, Music Player, Web Browser, System Monitor, Games, Calendar, Photo Gallery, Paint Studio, Stopwatch & Timer, World Clock, Password Generator, Task Manager, Recycle Bin, NEXUS Store, Desktop Widgets, and NEXUS Recovery.

The Calculator preserves seven modes: Calculate, Graph, Equations, Sequences, Statistics, Probability, and Python. The Python mode is a restricted local console, not a general-purpose interpreter.

## Requirements

- Windows 10 or Windows 11 for Electron packaging
- Node.js LTS and npm
- Internet access for the initial dependency installation

## Run the project

Install dependencies:

```powershell
npm install
```

Start the Electron desktop in development mode:

```powershell
npm run dev
```

Run the available static checks:

```powershell
npm run check
```

Open `index.html` directly or serve the project with a local static server to use the browser version.

## Build and package

Create an unpacked build:

```powershell
npm run build
```

Create a Windows NSIS installer:

```powershell
npm run dist
```

The generated installer and unpacked build are placed under `dist/`. Build output is intentionally ignored by Git.

If Windows packaging cannot create symbolic links while extracting `winCodeSign`, enable Windows Developer Mode or run the build from an elevated terminal.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Alt+Space` | Open NEXUS Spotlight |
| `Escape` | Close Spotlight or the active panel |
| `Arrow Up` / `Arrow Down` | Move through Spotlight results |
| `Enter` | Open the selected Spotlight result |
| `Ctrl+Space` | Open the application launcher |
| `Ctrl+Alt+E` | File Explorer |
| `Ctrl+Alt+T` | Terminal |
| `Ctrl+Alt+M` | Music Player |
| `Ctrl+Alt+S` | Settings |
| `Ctrl+Alt+C` | Calendar |
| `Ctrl+Alt+N` | Notes |
| `Ctrl+Alt+B` | Web Browser |
| `Ctrl+Alt+K` | Task Manager |

## Data and backups

Browser-mode data is stored locally in the active browser profile:

- Settings, notes, events, tasks, notifications, app registry, widgets, layouts, wallpapers, and recent apps use localStorage.
- Gallery photos use IndexedDB.
- Imported wallpapers are kept locally and are not uploaded.

Electron browser bookmarks, history, downloads, logs, and session data are stored under `%APPDATA%\\nexus-os`.

NEXUS Recovery exports a versioned JSON backup. Backups exclude lock PINs, profile photos, passwords, API keys, and browser cookies. Restore validates the file and exports a safety backup before applying selected categories.

## Security model

The Electron shell uses:

- `contextIsolation: true`
- `nodeIntegration: false`
- sandboxed preload scripts
- `webSecurity: true`
- explicit, validated IPC channels
- restricted external navigation
- Electron `WebContentsView` for the native browser
- no arbitrary extension download or execution from NEXUS Store

The lock-screen PIN is a convenience lock, not device-level security. Do not store sensitive credentials in Notes.

## Project structure

```text
index.html              Desktop shell and application layout
css/style.css           Theme, windows, widgets, and responsive styling
js/apps.js              Application registry and built-in applications
js/storage.js           Local persistence and backup snapshot data
js/main.js              Launcher, clock, Spotlight integration, and taskbar wiring
js/windows.js            Window movement, resizing, snapping, and layouts
js/store.js              NEXUS Store
js/spotlight.js          Universal search launcher
js/widgets.js            Desktop widget system
js/wallpaper.js          Wallpaper and live-wallpaper handling
js/recovery.js           Backup validation and restore UI
electron/main.js         Electron shell and IPC registration
electron/preload.js      Explicit renderer API bridge
electron/browser.js      Secure native browser using WebContentsView
electron/security.js     Electron security defaults
```

## Verification status

The project has been smoke-tested with the bundled Electron runtime and static diagnostics report no errors in the changed modules. Full npm linting, automated application tests, and Windows installer verification require a Node.js/npm environment and should be run before a production release.

Known limitations include simulated CPU/RAM telemetry in browser mode, a simulated File Explorer filesystem, browser storage quotas, and website compatibility differences between the native Electron browser and the static browser version.

## License

MIT
