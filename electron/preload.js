// Exposes a tiny save/quit API to the game (no Node access in the page)
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cardclubNative', {
  load: (key) => ipcRenderer.sendSync('store-load', key),
  save: (key, val) => ipcRenderer.send('store-save', key, val),
  quit: () => ipcRenderer.send('quit'),
  toggleFullscreen: () => ipcRenderer.send('fullscreen')
});
