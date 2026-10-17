# Plan: KI kann Dokumente formatieren

## Ausgangslage
- `agent.js`: Die KI führt `<lumi-actions>`-Aktionen aus (create_note, append_to_note, suggest_edits …). Formatieren gibt es nicht.
- `format.js`: Die Formatierungsleiste (Absatzformat, Schrift, Größe, Ausrichtung, Zeilenabstand, Design, Breite) ist an `exec`/`body` des Editors gebunden und hat keine API nach außen (`return { attach }`).
- `study.js:409` `textToHtml` kennt nur `<p>` und `<ul>`. Überschriften, Nummerierung, Fett und Kursiv aus KI-Text gehen verloren. Das ist die Hauptursache, warum es im Dokument nicht stimmt.
- `suggest.js` stellt `window.__lumiEd` bereit (`suggest`, `suggestAppend`, `text`).

## Änderungen
1. **[MODIFY] study.js – `textToHtml`**: Markdown-ähnliche Syntax wird in echtes HTML übersetzt.
   - `#`/`##`/`###` → `h1`–`h3`
   - `1.` → `ol`
   - `- ` → `ul`
   - `> ` → `blockquote`
   - `**fett**`, `*kursiv*`, `__unterstrichen__`
   - Tabellen mit `|`
   - Ergebnis: `create_note` und `append_to_note` erzeugen sauber formatierte Dokumente.
2. **[MODIFY] format.js – API**: `attach` gibt zusätzlich `apply(spec)` zurück.
   - `spec`: `{style, font, size, align, lineHeight, design, width, scope:"selection"|"all"|"headings"}`
   - Nutzt dieselben Funktionen wie die Leiste (`setSize`, `setFont`, `setLH`, `F.ds`, `F.w`).
   - `scope:"all"` markiert den gesamten Text, formatiert ihn und stellt die Auswahl wieder her.
   - Werte werden gegen die Listen `FONTS`, `SIZES`, `DESIGNS` und `WIDTHS` geprüft; ungültige Werte werden abgelehnt.
3. **[MODIFY] study.js (Editor, ~Zeile 495)**: Die Instanz von `Format.attach` wird als `window.__lumiFmt` bereitgestellt. Beim Verlassen wird sie wieder entfernt, so wie bei `__lumiEd`.
4. **[MODIFY] agent.js**:
   - Neue Aktion `format_doc {doc?, style?, font?, size?, align?, lineHeight?, design?, width?, scope?}` in `AGENT_RULES` und `ACTIONS`.
   - Ohne offenes Dokument gibt es die Meldung „Öffne zuerst eine Notiz“.
   - Neue Aktion `set_block {find, as:"h1"|"h2"|"h3"|"p"|"blockquote"}`: Absatz anhand des Textes finden und als Überschrift usw. setzen.
   - `AGENT_RULES` ergänzen: Formatierung über `format_doc` statt Text umschreiben. Inhalte mit `#`, `**`, `1.` schreiben.
   - Zusätzlicher Kontext für die KI: aktuelle Schriftart, Größe, Design und Breite des geöffneten Dokuments.
5. **[MODIFY] sw.js**: Cache-Version erhöhen.

## Prüfung
- `node --check` für die geänderten Dateien.
- Browser-Test mit Playwright: Notiz öffnen, über die Befehlsleiste „Mach alles Times New Roman 12, Blocksatz, Überschriften fett“ senden und prüfen, ob DOM und `d.fmt` stimmen.
- Außerdem: `create_note` mit Markdown erzeugt h1, ol und strong.

## Offene Frage
Sollen Formatänderungen sofort gelten (Standard im Plan) oder erst als Vorschlag zum Übernehmen oder Verwerfen wie bei `suggest_edits`?

Antworte mit „Ja“ (oder deiner Wahl bei der Frage), dann setze ich die Punkte 1–5 um und committe auf `claude/ki-formatierung-dokumente-nohhv1`.
