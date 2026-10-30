# Lumi AI – Anweisungsprotokoll

## Wo stehen die Anweisungen?
Weder Google AI Studio noch die Groq-Konsole können für einen API-Key feste Anweisungen speichern.
Die „System instructions" in AI Studio und die Prompts im Groq-Playground gelten nur im jeweiligen Test-Fenster, nicht für Aufrufe über deinen Key.
Deshalb schickt die App die Anweisungen bei **jeder Anfrage** selbst mit (`system`), und `api/ai.js` reicht sie unverändert an Gemini bzw. Groq weiter.
Das gilt für beide Anbieter gleich, auch beim automatischen Wechsel zwischen Modellen.

| Teil | Datei |
|---|---|
| Persönlichkeit, Sprache, Stil | `sysBase()` in `core.js` |
| Werkzeuge und Regeln | `AGENT_RULES` in `agent.js` |
| Stand der App (Index aller Dateien) | `agentContext()` in `agent.js` |
| Lese-Werkzeuge | `LOOKUPS` in `agent.js` |

## Aufbau jeder Anfrage (Reihenfolge ist Absicht)
1. **Fester Teil** (Persönlichkeit + Werkzeuge) steht immer vorn. Gemini cached gleiche Anfangsstücke automatisch, das spart Tokens und Zeit.
2. **Variabler Teil** (Index, offenes Dokument, Datum, Anhänge) steht hinten.
3. Chatverlauf: die letzten Nachrichten.

## Wissen über alle Dateien (token-sparend)
- Die KI bekommt einen **Index aller Dokumente**: pro Ordner eine Zeile `Ordner: [id] Titel; [id] Titel` – ohne Inhalt (bis 400 Dokumente, Titel auf 45 Zeichen gekürzt).
- Inhalte holt sie nur bei Bedarf über Lese-Werkzeuge:
  - `search_docs {query}` durchsucht Titel und Inhalt aller Dokumente, liefert die 6 besten Treffer mit kurzem Ausschnitt.
  - `read_doc {doc, from}` liefert höchstens 6000 Zeichen eines Dokuments (mit Hinweis, ab wo es weitergeht).
- Ablauf: Die KI sendet **nur** den Lese-Block → die App führt ihn aus → das Ergebnis geht automatisch zurück an die KI → sie antwortet. Höchstens 3 Leseschritte pro Anfrage.

## Schreib-Werkzeuge
Die KI schreibt einen kurzen Satz und hängt genau einen Block an:

```
<lumi-actions>[{"action":"…", …}]</lumi-actions>
```

`create_note`, `append_to_note`, `suggest_edits`, `rename_doc`, `move_doc`, `create_folder`, `create_database`, `create_cards`, `add_task`, `complete_task`, `add_grade`, `delete_doc` (mit Bestätigung), `open`.
Felder und Beispiele stehen in `AGENT_RULES`. Dokumente, Aufgaben und Stapel werden mit ID oder Titel aus dem Index angegeben.

## Regeln
- Nie etwas ankündigen, ohne den Block zu senden.
- Nur Dokumente verwenden, die im Index stehen; nichts erfinden.
- Datumsangaben anhand von „Heute" in `JJJJ-MM-TT` umrechnen.
- Bei fehlenden wichtigen Angaben kurz nachfragen.
- Bei reinen Fragen ohne Block antworten.
- Antworten kurz; Inhalte erst lesen, dann antworten.

## Schreibstil in Dokumenten
- Überschriften als eigene Zeile mit `## ` (Unterpunkte `### `).
- Kurze Absätze, durch Leerzeile getrennt.
- Aufzählungen mit `- `, Schritte mit `1. `.
- Keine Wiederholungen, Wichtiges knapp. Der Editor setzt daraus echte Überschriften und Listen.

## Animation im Chat
- Text blendet Wort für Wort ein.
- Aufzählungspunkte erscheinen erst, wenn der Text ihrer Zeile da ist.
- Die Aktionsbox (Haken-Liste) erscheint erst, wenn der gesamte Text sichtbar ist (`streamMs` in `agent.js` liefert die Dauer).

## Modelle und Reihenfolge
Standard ist Gemini Flash Lite (500 Anfragen pro Tag). Ist ein Modell aufgebraucht (429) oder ausgelastet, probiert der Server automatisch das nächste:
Flash Lite → Flash → 2.5 Flash Lite → 2.5 Flash → Groq (Llama 8B/70B, GPT-OSS).
Pro-Modelle sind im Gratis-Tarif nicht nutzbar und wurden entfernt.
