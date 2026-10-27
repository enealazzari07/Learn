"use strict";
/* Lumi für Windows – schlankes Desktop-Fenster. Der EXE-Ordner enthält KEINEN Lumi-Quellcode und keine Schlüssel:
   Die App wird von der gesicherten Lumi-Adresse (HTTPS) geladen, alle Geheimnisse (KI-, Zahlungs-, Datenbank-Schlüssel) liegen nur auf dem Server. */
const { app, BrowserWindow, shell, session, Menu } = require("electron");
const path = require("path");

const START_URL = process.env.LUMI_URL || "https://lumi-ten-nu.vercel.app/#/app";
const HOME = new URL(START_URL).origin;
/* Nur diese Adressen dürfen im Fenster geöffnet/eingebettet werden (Zahlung von Stripe, Anmeldung bei Supabase, Google-Schriften) */
const ALLOWED_FRAME = [HOME, "https://js.stripe.com", "https://checkout.stripe.com", "https://hooks.stripe.com", "https://m.stripe.network", "https://link.com", "https://link.co"];

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });

function createWindow() {
  const win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 600, show: false, backgroundColor: "#f3f3f4", title: "Lumi",
    icon: path.join(__dirname, "icon.png"), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, devTools: false, spellcheck: true, partition: "persist:lumi" },
  });
  win.setMenuBarVisibility(false);
  win.once("ready-to-show", () => win.show());
  win.loadURL(START_URL).catch(() => win.loadFile(path.join(__dirname, "offline.html")));
  win.webContents.on("did-fail-load", (_e, code, _d, url, isMain) => { if (isMain && code !== -3) win.loadFile(path.join(__dirname, "offline.html")); });

  /* Navigation nur innerhalb von Lumi; alles andere öffnet im Standard-Browser */
  const isHome = u => { try { return new URL(u).origin === HOME; } catch { return false; } };
  win.webContents.on("will-navigate", (e, url) => { if (!isHome(url) && !url.startsWith("file:")) { e.preventDefault(); if (/^https:/.test(url)) shell.openExternal(url); } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-attach-webview", e => e.preventDefault());
  /* F5 / Strg+R: neu laden, Strg+Shift+R / Strg+F5: Zwischenspeicher umgehen */
  win.webContents.on("before-input-event", (e, i) => { if (i.type !== "keyDown") return; const k = i.key.toLowerCase(); if (k === "f5" || ((i.control || i.meta) && k === "r")) { e.preventDefault(); (i.shift || i.control && k === "f5") ? win.webContents.reloadIgnoringCache() : win.webContents.reload(); } });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const ses = session.fromPartition("persist:lumi");
  /* keine Gerätefreigaben ausser Zwischenablage, Vollbild und (für Fotos/Audio-Notizen) Kamera & Mikrofon nur von Lumi selbst */
  ses.setPermissionRequestHandler((wc, permission, cb, details) => { const o = (() => { try { return new URL(details.requestingUrl).origin; } catch { return ""; } })(); cb(o === HOME && ["clipboard-read", "clipboard-sanitized-write", "fullscreen", "media", "notifications"].includes(permission)); });
  ses.webRequest.onBeforeRequest({ urls: ["http://*/*"] }, (d, cb) => cb({ cancel: !/^http:\/\/(localhost|127\.0\.0\.1)/.test(d.url) }));   // kein unverschlüsseltes HTTP
  ses.clearCache().catch(() => {});   // beim Start immer die neueste Lumi-Version holen (Anmeldung und App-Daten bleiben erhalten)
  createWindow();
  app.on("activate", () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("web-contents-created", (_e, wc) => { wc.on("will-attach-webview", ev => ev.preventDefault()); });
