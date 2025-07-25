# Todo

- Code Comments
- Test im Uni-Environment
- Saubere Installationsanleitung

# Projektname

Webkartographie 2025: Live-Daten

## Beschreibung

Dies ist ein Beispielprojekt, das eine API bereitstellt, um Live-Daten zu ziehen und in einem GEOJSON-Format zu speichern. Es enthält sowohl Backend- als auch Frontend-Komponenten.

## Ordnerstruktur

- backend: Enthält den Backend-Code, der den API-Call bereitstellt.
- frontend: Enthält den Frontend-Code, der die Benutzeroberfläche bereitstellt.
- data: Enthält die Daten, die vom API-Request ausgegeben wurden und unsere verarbeiteten GEOJSON-Daten.
- legacy: Enthält veraltete oder nicht mehr verwendete Dateien.

## Dateien

- backend/backend_api_to_geo.py: Zieht die neusten Live-Daten und speichert in GEOJSON
- frontend/index.html: Frontend-Datei, die die Karte anzeigt
- frontend/style.css: Stile für die Karte
- frontend/js/script.js: JavaScript für die Interaktivität der Karte

## Legende in der Webkarte (WIP)
- Rot: Average Delay
- Gelb/Orange: Average Delay (2nd)
- Grün: Average Delay (3rd)

- Umrechnung muss noch geändert werden, da ein verspäteter ICE den Bahnhof komplett rot einfärbt, obwohl es nur eine Linie betrifft.

## Workflowdiagramm

![Workflow Diagramm](workflow%20V1.png)

## Installation

- In VSCode: F1 (Command Palette) -> Python: Create Environment (Python 3.11, Venv, requirements.txt)
- Backend starten: run_server_and_backend.py
- Frontend starten: index.html im Browser öffnen (bzw. http://localhost:8080/index.html)