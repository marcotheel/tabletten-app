# Tabletten Erinnerung – Progressive Web App

Diese Version läuft als PWA im Browser und kann auf Android und iPhone installiert werden.

## Funktionen

- Medikamente anlegen
- Bestand eintragen
- Einnahme pro Tag
- Erinnerungsgrenze festlegen
- Nachbestelldatum berechnen
- lokale Speicherung im Browser
- offline nutzbar
- als App installierbar

## Lokal testen

Im Ordner starten:

```bash
python -m http.server 8080
```

Dann öffnen:

```text
http://localhost:8080
```

## Auf dem Handy testen

Die Dateien auf einen Webserver hochladen, z. B.:

- GitHub Pages
- Netlify
- Vercel
- eigener Webspace

## Installation auf Android

1. Webseite in Chrome öffnen
2. Menü öffnen
3. „Zum Startbildschirm hinzufügen“ oder „App installieren“

## Installation auf iPhone

1. Webseite in Safari öffnen
2. Teilen-Symbol antippen
3. „Zum Home-Bildschirm“ auswählen“

## Hinweis zu Benachrichtigungen

Die PWA speichert alles lokal. Für absolut zuverlässige Push-Erinnerungen müsste später ein Server oder eine native App ergänzt werden.
