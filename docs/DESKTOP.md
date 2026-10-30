# Studix für Windows (Desktop-Fenster)

Ordner `desktop/`: ein schlankes Electron-Fenster, das Studix von der gesicherten Adresse lädt (`https://lumi-ten-nu.vercel.app`, änderbar über `LUMI_URL`).
Die fertige EXE enthält **keinen Studix-Quellcode und keine Schlüssel**: nur `main.js`, ein Offline-Hinweis und das Icon. Die Schlüssel (KI, Stripe, Datenbank) liegen ausschliesslich in Vercel.

Gebaut mit: `cd desktop && npm install && npx electron-packager . Studix --platform=win32 --arch=x64 --out=../dist --overwrite --asar --ignore="/node_modules"`
Danach den Ordner `dist/Studix-win32-x64` zippen.

Sicherheit im Fenster: kein Node-Zugriff in der Seite, abgeschirmt (sandbox/contextIsolation), keine Entwicklerwerkzeuge, Navigation nur innerhalb von Studix (alles andere öffnet im Browser), kein unverschlüsseltes HTTP, nur nötige Berechtigungen für Studix selbst.
Hinweis: Eine Web-App lässt sich nie komplett vor Einsicht schützen – ihr Frontend-Code ist wie auf jeder Website im Browser lesbar. Wichtig ist, dass keine Geheimnisse darin stehen.

Nicht signiert: Windows SmartScreen warnt beim ersten Start. Für eine Signatur braucht es ein Code-Signing-Zertifikat.
