# Lumi – Lern-App für Schule und Studium

Statische Web-App (kein Build-Schritt). Öffne `index.html` oder starte `npx http-server`.

- **/app** – Notizen-Editor (Formatierung, Tabellen, Formeln, Bilder, Checklisten), Zeichnen direkt in der Notiz (Stift, Marker, Radierer, Formen), Dateien & PDFs, Karteikarten (Spaced Repetition), Quiz, Planer (Aufgaben, Stundenplan, Kalender), Noten, Fokus-Timer, KI-Tutor, Suche, Backup/Import.
- **KI**: eigenen Anthropic-API-Key unter Einstellungen eintragen. Ohne Key laufen Zusammenfassung, Karteikarten und Quiz aus Dokumenten lokal.
- **Daten** liegen lokal im Browser (IndexedDB), funktionieren offline (Service Worker) und lassen sich als JSON exportieren.

## Microsoft 365 (Outlook, OneNote, Teams)
Trage einmalig die Azure-„Anwendungs-(Client-)ID“ in `config.js` ein (`msClientId`). Danach melden sich alle Nutzer:innen mit einem Klick an („Mit Microsoft anmelden“). Umleitungs-URI in Azure (SPA): die Adresse der App, z. B. `https://deine-app.vercel.app/`.

## KI (Google Gemini über Vercel)
Die KI läuft serverseitig über `api/ai.js`. In Vercel unter *Settings → Environment Variables* `GEMINI_API_KEY` setzen (kostenloser Key: https://aistudio.google.com/apikey), optional `GEMINI_MODEL` (Standard `gemini-2.5-flash-lite`), danach neu deployen. Der Key bleibt auf dem Server.
