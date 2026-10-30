"use strict";
/* Studix – Hinweis zu Cookies und lokalem Speicher (einmalig, schliesst sich mit „Verstanden“).
   Es werden nur technisch notwendige Daten genutzt (Anmeldung, E-Mail-Adresse des Kontos, App-Daten, Einstellungen); keine Werbe- oder Tracking-Cookies. */
(() => {
  const KEY = "studix-cookie-ok";
  if (/[?&]embed=1/.test(location.search)) return; /* Demo-Vorschau: kein Banner */
  try { if (localStorage.getItem(KEY)) return; } catch {}
  const st = document.createElement("style");
  st.textContent = `#ckb{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:2000;max-width:460px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 12px 12px 16px;border-radius:20px;background:#fff;color:#111;border:1px solid #ececf0;font:500 13.5px/1.35 Inter,system-ui,sans-serif;box-shadow:0 10px 36px rgba(20,20,40,.16);animation:ckin .4s ease both}
#ckb svg{flex:none;width:26px;height:26px;fill:none;stroke:#111;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
#ckb p{margin:0;flex:1;color:#555}#ckb a{color:#111;font-weight:600;text-decoration:underline}
#ckb button{flex:none;border:0;border-radius:999px;background:#111;color:#fff;font:700 13.5px Inter,system-ui,sans-serif;padding:10px 16px;cursor:pointer}
@keyframes ckin{from{opacity:0;transform:translateY(12px)}}
@media (max-width:700px){#ckb{bottom:calc(88px + env(safe-area-inset-bottom))}}`;
  document.head.appendChild(st);
  const show = () => {
    if (document.getElementById("ckb")) return;
    const b = document.createElement("div"); b.id = "ckb"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Hinweis zu Cookies");
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.5A9 9 0 1 1 11.5 3a4 4 0 0 0 4.5 4.5 3.5 3.5 0 0 0 5 5z"/><circle cx="8.5" cy="10" r=".8" fill="#111"/><circle cx="12" cy="15.5" r=".8" fill="#111"/><circle cx="15.5" cy="12.5" r=".8" fill="#111"/><circle cx="8.5" cy="14.5" r=".8" fill="#111"/></svg><p>Nur notwendige Cookies, keine Werbe-Cookies. Anonyme Statistik ohne Cookies. <a href="legal.html#datenschutz">Mehr erfahren</a></p><button type="button">OK</button>`;
    b.querySelector("button").onclick = () => { try { localStorage.setItem(KEY, "1"); } catch {} b.remove(); };
    document.body.appendChild(b);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", show); else show();
})();
