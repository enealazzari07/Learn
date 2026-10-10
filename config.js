/* Lumi – Konfiguration
   Trage hier EINMAL die "Anwendungs-(Client-)ID" deiner Azure-App-Registrierung ein.
   Danach können alle Nutzer:innen mit einem Klick auf "Mit Microsoft anmelden" Outlook-Kalender,
   OneNote und Teams verbinden – ohne etwas einzurichten.
   Umleitungs-URI in Azure (Plattform "Single-Page-Anwendung"): die Adresse dieser App, z. B. https://deine-app.vercel.app/ */
window.LUMI_CONFIG = Object.assign({ msClientId: "", msTenant: "common", supabaseUrl: "https://rzbmtzxukqfdkcmfmugv.supabase.co", supabaseKey: "sb_publishable_1AJLgVlp0Q-J4UdMni8ObA_uXWUD1ae" }, window.LUMI_CONFIG || {});
