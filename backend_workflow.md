+-------------------+
|   Start Backend   |
+-------------------+
         |
         v
+-------------------+
|   Pfade & Logging |
|   initialisieren  |
+-------------------+
         |
         v
+-------------------+
|   Endlosschleife  |
+-------------------+
         |
         v
+-------------------+
| Für jeden Bahnhof |
| in der Liste:     |
+-------------------+
         |
         v
+-----------------------------+
| 1. API-Anfrage stellen      |
| 2. Antwort verarbeiten      |
| 3. Neue Abfahrten speichern |
+-----------------------------+
         |
         v
+-----------------------------+
| Geodaten aktualisieren      |
| (GeoJSON erzeugen)          |
+-----------------------------+
         |
         v
+-------------------+
|   Warten/Pause    |
+-------------------+
         |
         v
+------------------------+
|   Nächster Durchlauf   |
+------------------------+