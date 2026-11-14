# NEXUS OS 4.0 — Desktop Edition

NEXUS OS 4.0 keeps the existing browser-based desktop experience and adds a separate Electron desktop shell for real Windows application packaging while preserving the GitHub Pages web version. The project stays fully client-side with HTML, CSS, and vanilla JavaScript, no backend, and local persistence.

## Run NEXUS OS from GitHub

Choose one option:

### Option A: Use it in your browser (recommended)

1. Open the repository's [GitHub Pages settings](https://github.com/ItzSampaio/nsei/settings/pages).
2. Find **Build and deployment**.
3. For **Source**, choose **Deploy from a branch**.
4. For **Branch**, choose `main`.
5. For the folder, choose `/ (root)`.
6. Click **Save**.
7. Wait a few minutes. Refresh the Pages settings page; when GitHub shows that the site is published, click **Visit site**. The site address should be [https://itzsampaio.github.io/nsei/](https://itzsampaio.github.io/nsei/).
8. If you see a 404, wait a little longer and try again. Confirm the selected branch is `main` and the folder is `/ (root)`.

You cannot run the app by opening the GitHub code page or the README. GitHub Pages hosts the **web version**; it does not install the Windows desktop application.

### Option B: Run the web version on your computer

1. On the repository page, click the green **Code** button.
2. Click **Download ZIP**.
3. When the download finishes, right-click the ZIP file and choose **Extract All**.
4. Open the extracted `nsei-main` folder.
5. Double-click `index.html`. It should open in your default web browser.

### Option C: Run the Windows desktop app (Electron)

1. Install the current **Node.js LTS** release from [nodejs.org](https://nodejs.org/). npm is included with Node.js.
2. Download the repository ZIP using **Code → Download ZIP**, then extract it as described above.
3. Open the extracted project folder in File Explorer.
4. Click the folder address bar, type `powershell`, and press **Enter** to open PowerShell in that folder.
5. Install the project dependencies by running:

```powershell
npm install
```

6. Start NEXUS OS by running:

```powershell
npm run dev
```

7. To close the desktop app, close its window as you would any other Windows app.

To build an installer yourself, run `npm run dist` in the same PowerShell window. The installer will be created locally at `dist\NEXUS OS Setup 4.0.0.exe`; it is not included in the GitHub source download. The Electron desktop browser has a known visual rendering issue, so the installer should be treated as a test build.

## Current verification status

- The Electron desktop and Windows installer build successfully; the installed desktop was launched and remained visible.
- The native browser accepts navigation and updates its title and URL, but the website content area has rendered black in packaged-app testing. Treat native browser rendering as a known issue until it is visually verified.
- The 18 app launchers are present. A complete functional test of all apps and the packaged browser features has not been completed.
- The Windows installer is a test build, not a verified stable release.

## Desktop conversion

- `package.json` configures Electron, secure preload, and Windows installer packaging.
- `electron/main.js` creates the desktop app shell and loads the existing NEXUS OS interface.
- Electron startup, renderer, window-lifecycle, and browser-navigation diagnostics are appended to `%APPDATA%\nexus-os\nexus-os.log`.
- `electron/browser.js` and `electron/browser-window.html` provide a Chromium browser built with Electron `WebContentsView`. Its tabs use separate web contents without the NEXUS preload; web security, context isolation, and sandboxing remain enabled.
- The desktop browser implements tabs, Google search, navigation, bookmarks, persistent/searchable history, downloads with progress, and safe opening of completed downloads. Packaged-app rendering and complete feature behavior still require verification (see status above).
- Browser bookmarks and history are stored under Electron's user-data directory; the browser session uses a persistent Chromium partition. Existing web-version localStorage and IndexedDB are not reset.
- `electron/security.js` denies unhandled popup windows. Browser page popups become new tabs, while the OS renderer cannot be navigated to remote websites.
- The Calculator app has a safe expression parser (no `eval` or `Function`), scientific functions, DEG/RAD mode, fractions, and an in-app calculation history.
- The original browser project remains usable by opening `index.html` directly or via a static host such as GitHub Pages.

## Electron development and packaging

Requirements: Windows 10/11, Node.js LTS with npm, and an internet connection for dependency installation. From the project folder, run `npm install`. Use `npm run dev` to launch the Electron development build, `npm run build` for an unpacked Windows build, and `npm run dist` to create the Windows NSIS installer. The installer offers desktop and Start menu shortcuts.

To install a generated installer, run `dist\NEXUS OS Setup 4.0.0.exe` and follow the setup prompts. The installer is generated locally and is not included in the source repository.

If Windows packaging reports that it cannot create symlinks while extracting `winCodeSign`, enable **Windows Developer Mode** in **Settings → System → For developers → Developer Mode**, or run the build from an elevated terminal with the **Create symbolic links** user right. Then retry `npm run dist`.

The browser's main window is launched from the Web Browser app. Navigation, bookmarks, history, downloads, and tabs are available in that separate Chromium window; the web-only version continues to use its original sandboxed iframe and may be restricted by websites.

If a packaged launch does not show a window, run `dist\win-unpacked\NEXUS OS.exe` from PowerShell and inspect `%APPDATA%\nexus-os\nexus-os.log`. If the log is not created or has no new startup entry, check **Event Viewer → Windows Logs → Application** for an early process failure.

## Run locally

Open `index.html` directly, or serve this folder with VS Code Live Server.

## Publish on GitHub Pages

1. Put the contents of `NEXUS_OS` at the root of a GitHub repository (or configure Pages to use this folder).
2. In repository settings, open **Pages** and select the branch and folder containing `index.html`.
3. Wait for the Pages deployment, then open the provided URL.

All asset, stylesheet, and script paths are relative, so NEXUS OS also works from a repository subpath.

## Included applications

The desktop includes Terminal, Calculator, simulated File Explorer, Settings, Notes, About, Music Player, Web Browser, System Monitor, Games (Snake and Tic-Tac-Toe), Calendar, Photo Gallery, Paint Studio, Stopwatch & Timer, World Clock, Password Generator, Task Manager, and Recycle Bin.

- **Photo Gallery:** import, search, browse, and remove local images. Photo blobs are stored in IndexedDB and never uploaded. The browser may limit local storage capacity.
- **Paint Studio:** draw with a mouse, touch, or pen; change color and brush size; erase; undo/redo; and download a PNG.
- **Stopwatch & Timer:** run, pause, reset, and configure a countdown. Timer completion creates a notification and an optional local sound effect.
- **World Clock:** add or remove supported time zones; the city list is saved locally.
- **Password Generator:** choose length and character classes, generate using the browser's cryptographically secure random-number API, and copy to the clipboard.
- **Task Manager:** add, edit, prioritize, complete, filter, and delete tasks. Deleted tasks can be restored or permanently removed in Recycle Bin.
- **Recycle Bin:** restore or permanently delete removed notes and tasks.

## Desktop and personalization

- Animated boot and lock screens, optional PIN convenience lock, user name, emoji avatar or local profile photo.
- Draggable, resizable, minimizable and maximizable windows; drag a window to the top edge to maximize or to a side edge to snap.
- Drag desktop icons to rearrange them. Use Ctrl/Shift-click to select icons.
- Search apps in the launcher and reopen recent apps.
- Notification history persists locally and can be cleared from the notification center.
- Quick settings include theme, sound mute, system volume, lock, Settings, and Calendar.
- Settings include wallpaper, preset/custom accent, light/dark theme, boot animation, startup sound, interface animations, desktop icon visibility, taskbar edge, and pinned apps.
- `Ctrl+Space` opens the launcher. `Ctrl+Alt` shortcuts: `E` File Explorer, `T` Terminal, `M` Music Player, `S` Settings, `C` Calendar, `N` Notes, `G` Photo Gallery, `P` Paint Studio, `W` World Clock, `K` Task Manager, and `B` Web Browser.

## Project structure

- `index.html` — desktop shell, startup and lock screens, system panels, icon library, and ordered scripts.
- `css/style.css` — desktop, window, application, responsive, and theme styling.
- `js/main.js` — launcher, app search, desktop clock, and toast notifications.
- `js/system.js` — boot/unlock, quick settings, sound, notifications, shortcuts, and desktop context menu.
- `js/windows.js` — window focus, drag, resizing, maximize/minimize, and edge snapping.
- `js/apps.js` — app registry, settings UI, launcher recents, desktop shortcuts, and original desktop apps.
- `js/storage.js` — localStorage preferences, notes, events, tasks, recycle-bin and notification history; IndexedDB photo storage.
- `js/terminal.js`, `js/music.js`, `js/browser.js`, `js/monitor.js`, `js/games.js`, `js/calendar.js` — original application modules.
- `js/gallery.js`, `js/paint.js`, `js/time-tools.js`, `js/world-clock.js`, `js/password.js`, `js/tasks.js`, `js/recycle.js` — NEXUS OS 3 application modules.
- `assets/wallpapers/nexus.svg` — bundled custom wallpaper.
- `assets/icons/nexus.svg` — browser tab icon.

## Local data and limitations

- Settings, notes, calendar events, tasks, recycle-bin entries, notification history, and recent apps are stored in localStorage. Imported photos are stored in IndexedDB. Data stays in the current browser profile and is not synchronized.
- Removing a note or task sends it to the Recycle Bin. Emptying the bin permanently removes its contents.
- The lock-screen PIN is a convenience UI lock only; it is not device-level security and should not be used to protect sensitive information.
- Imported photos and selected music files are handled locally and are not uploaded. The browser does not persist local audio file handles between sessions.
- The File Explorer uses a simulated file system and cannot access the computer's files.
- The embedded browser uses an iframe. Many websites prohibit embedding; use **Open in a new tab** when a site blocks the frame.
- System Monitor CPU/RAM charts are simulated. The browser memory figure is shown only when the browser exposes that API.
- Startup audio and subtle UI sounds are synthesized locally with Web Audio. Browsers may require a user gesture before playing audio; use Quick Settings to mute sounds.
- Browser storage is subject to per-browser quotas and can be cleared by the user or browser.

## Test checklist

1. Open `index.html`, wait for boot, and unlock. Disable/re-enable boot animation in Settings and reload.
2. Open each desktop icon and verify window drag, resize, snap, minimize, maximize, close, and taskbar reopen. Check launcher search and recent apps.
3. In Gallery, import a test image, search it, open the viewer, navigate, delete it, and reload to verify storage.
4. In Paint Studio, draw, erase, undo/redo, resize the window, and download a PNG.
5. In Stopwatch & Timer, start/pause/reset a stopwatch and run a short countdown to receive a completion notification.
6. In World Clock, add and remove a city; reload and check the remaining list.
7. In Password Generator, change length and character options, generate a password, and try Copy.
8. In Task Manager, add/edit/complete/delete a task. Open Recycle Bin to restore it, then test permanent deletion.
9. In Notes, create and delete a temporary note, then restore or permanently remove it from Recycle Bin.
10. Check Settings persistence (profile, wallpaper, accent, theme, taskbar, animation and boot choices), notification history, volume/mute, keyboard shortcuts, and narrow-screen layout.

## Security and privacy

NEXUS OS is a client-side demonstration. Do not use its PIN as account security or store credentials in Notes. Password generation runs on-device and does not save generated values.
