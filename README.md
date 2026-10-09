# Lumi – Lern-App für Schule und Studium

Statische Web-App (kein Build-Schritt). Öffne `index.html` oder starte `npx http-server`.

- **/app** – Notizen-Editor (Formatierung, Tabellen, Formeln, Bilder, Checklisten), Whiteboard (Stift, Marker, Formen, Text, Bilder), Dateien & PDFs, Karteikarten (Spaced Repetition), Quiz, Planer (Aufgaben, Stundenplan, Kalender), Noten, Fokus-Timer, KI-Tutor, Suche, Backup/Import.
- **KI**: eigenen Anthropic-API-Key unter Einstellungen eintragen. Ohne Key laufen Zusammenfassung, Karteikarten und Quiz aus Dokumenten lokal.
- **Daten** liegen lokal im Browser (IndexedDB), funktionieren offline (Service Worker) und lassen sich als JSON exportieren.
