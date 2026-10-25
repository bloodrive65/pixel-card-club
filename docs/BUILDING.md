# Building and Releasing

## Requirements
- [Node.js](https://nodejs.org) 18 or newer (20 LTS recommended)
- Git

## Run from source

```bash
git clone https://github.com/bloodrive65/pixel-card-club.git
cd pixel-card-club
npm install
npm start
```

To play without Node, just open `app/index.html` in a browser.

## Build Windows executables

Run this on Windows (PowerShell or Command Prompt):

```bash
npm run dist:win
```

The output goes to `release/`:

| File | What it is |
|---|---|
| `Pixel Card Club Setup 1.0.0.exe` | Installer with Start-menu and desktop shortcuts and an uninstaller |
| `PixelCardClub-1.0.0-portable.exe` | Single-file portable game |
| `win-unpacked/` | Unpacked app folder (`Pixel Card Club.exe`) |

For a zip instead, run `npm run dist:win-zip`.

> Building Windows targets on Linux or macOS works for `zip`, but setting the .exe icon needs Wine. You can skip that with
> `npx electron-builder --win zip -c.win.signAndEditExecutable=false`.

## Automatic releases with GitHub Actions

`.github/workflows/release.yml` builds the Windows installer and portable .exe on a GitHub Windows runner and attaches them to a GitHub Release.

1. Update `"version"` in `package.json` (for example `1.1.0`).
2. Commit, then tag and push:
   ```bash
   git tag v1.1.0
   git push origin master --tags
   ```
3. A few minutes later, the release appears under **Releases** with the downloadable `.exe` files.

You can also start it by hand from the **Actions** tab (**Build Windows release → Run workflow**). A manual run uploads the files as workflow artifacts instead of a release.

## Changing the window

The window size, minimum size and title are set in `electron/main.js`. **F11** toggles fullscreen. The menu bar is hidden.
