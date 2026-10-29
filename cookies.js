"use strict";
/* Studix – Hinweis zu Cookies und lokalem Speicher (einmalig, schliesst sich mit „Verstanden“).
   Es werden nur technisch notwendige Daten genutzt (Anmeldung, E-Mail-Adresse des Kontos, App-Daten, Einstellungen); keine Werbe- oder Tracking-Cookies. */
(() => {
  const KEY = "studix-cookie-ok";
  try { if (localStorage.getItem(KEY)) return; } catch {}
  const st = document.createElement("style");
  st.textContent = `#ckb{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:2000;max-width:620px;margin:0 auto;display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:20px;background:#111;color:#fff;font:500 13.5px/1.4 Inter,system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.28);animation:ckin .4s ease both}
#ckb p{margin:0;flex:1}#ckb a{color:#fff;text-decoration:underline}
#ckb button{flex:none;border:0;border-radius:999px;background:#fff;color:#111;font:700 13.5px Inter,system-ui,sans-serif;padding:10px 18px;cursor:pointer}
@keyframes ckin{from{opacity:0;transform:translateY(12px)}}
@media (max-width:700px){#ckb{bottom:calc(88px + env(safe-area-inset-bottom));flex-direction:column;align-items:stretch;text-align:left}#ckb button{width:100%}}`;
  document.head.appendChild(st);
  const show = () => {
    if (document.getElementById("ckb")) return;
    const b = document.createElement("div"); b.id = "ckb"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Hinweis zu Cookies");
    b.innerHTML = `<p>Studix nutzt nur technisch notwendige Cookies und lokalen Speicher – für Anmeldung, deine E-Mail-Adresse (Konto und Mailversand) und deine App-Daten. Kein Tracking, keine Werbung. <a href="legal.html#datenschutz">Mehr erfahren</a></p><button type="button">Verstanden</button>`;
    b.querySelector("button").onclick = () => { try { localStorage.setItem(KEY, "1"); } catch {} b.remove(); };
    document.body.appendChild(b);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", show); else show();
})();
