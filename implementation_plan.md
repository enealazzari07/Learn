# Implementation Plan: Goodnotes-inspired Features für Studix

Basis: nur öffentlich dokumentierte Funktionen (Goodnotes-Blog, Reviews, App-Store). Keine Dekompilierung, kein Code, keine Assets, kein Branding kopiert. Alles wird eigenständig neu gebaut.

## Vergleich: Goodnotes vs. Studix (Ist-Stand)

| Funktion (Goodnotes, öffentlich) | Studix heute | Status |
|---|---|---|
| Stift, Marker, Radierer, Formen | `ink.js` | vorhanden |
| Lasso (verschieben/skalieren) | `ink.js` | vorhanden |
| Laserpointer | `ink.js` | vorhanden |
| Papier: Karo/Linien/Punkte | `ink.js` (grid) | vorhanden |
| PDF annotieren | `pdfedit.js` | vorhanden |
| Karteikarten / Quiz / KI | `study.js`, `agent.js` | vorhanden |
| Scribble-to-erase (Kritzeln = löschen) | – | **fehlt** |
| Circle-to-Lasso (Umkreisen = Auswahl) | – | **fehlt** |
| Handschrift suchen (OCR) | – | **fehlt** |
| Audio-Aufnahme, an Notiz gebunden | – | **fehlt** |
| Sticker / Bild-Bibliothek | – | **fehlt** |
| Seiten-Vorschau (Thumbnails), Seiten umsortieren | – | **fehlt** |
| Math Assist (Gleichung + "=" → Lösung) | – | **fehlt** |
| Ask-Goodnotes-Äquivalent (KI fragt eigene Notizen) | `agent.js` teilw. | prüfen |
| Dynamische Vorlagen (Größe/Farbe) | nur 3 Raster | **fehlt** |

## Vorschlag (nach Nutzen/Aufwand)

**Phase 1 – klein, nur `ink.js`**
1. [MODIFY] `ink.js` – Scribble-to-erase: Zickzack-Strich über Strichen erkennen → Striche löschen.
2. [MODIFY] `ink.js` – Circle-to-Lasso: geschlossene Schleife mit Haltegeste → Auswahl.
3. [MODIFY] `ink.js` – Papier-Vorlagen erweitern (Cornell, Wochenplan, Papierfarbe).

**Phase 2 – neue Module**
4. [NEW] `stickers.js` – eingebaute SVG-Sticker + eigene Bilder, als Objekte platzier-/skalierbar.
5. [NEW] `audio.js` – MediaRecorder, Aufnahme in IndexedDB (`db.js`), Zeitstempel pro Strich → Tippen auf Strich spielt Audio ab.
6. [NEW] `pages.js` – Thumbnail-Seitenleiste, Drag-Umsortieren, Seite einfügen/duplizieren.

**Phase 3 – KI (über bestehendes `api/ai.js`)**
7. [NEW] `hwsearch.js` – Handschrift → Text per Gemini-Vision, Index in `db.js`, Suche in `suggest.js`.
8. [NEW] `mathassist.js` – Gleichung + "=" erkennen, Lösung als Overlay.

**Dateien, die berührt werden:** `ink.js`, `db.js`, `suggest.js`, `main.js`, `index.html`, `app.css`, `sw.js` (Cache-Liste).

## Offene Fragen
- Alle 3 Phasen oder nur Phase 1+2?
- Welche Features sind dir am wichtigsten (Reihenfolge)?
- OCR/Math: Gemini-Key über Vercel ist ok (Kosten/Datenschutz)?

Warte auf deine Freigabe ("Yes" + Auswahl).
