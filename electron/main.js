// Pixel Card Club - Electron desktop wrapper (Windows / macOS / Linux)
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const saveFile = () => path.join(app.getPath('userData'), 'save.json');
let data = {};
function loadData() { try { data = JSON.parse(fs.readFileSync(saveFile(), 'utf8')); } catch (_) { data = {}; } }
function writeData() { try { fs.mkdirSync(path.dirname(saveFile()), { recursive: true }); fs.writeFileSync(saveFile(), JSON.stringify(data, null, 2)); } catch (e) { console.error('Save failed', e); } }

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 760, minWidth: 660, minHeight: 400,
    backgroundColor: '#0b0c14', title: 'Pixel Card Club', autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'app', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
}

ipcMain.on('store-load', (e, key) => { e.returnValue = key in data ? data[key] : null; });
ipcMain.on('store-save', (e, key, val) => { if (val === null) delete data[key]; else data[key] = val; writeData(); });
ipcMain.on('quit', () => app.quit());
ipcMain.on('fullscreen', () => win && win.setFullScreen(!win.isFullScreen()));

app.whenReady().then(() => { loadData(); createWindow(); });
app.on('window-all-closed', () => app.quit());
