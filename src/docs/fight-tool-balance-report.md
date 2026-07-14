# Fight-Tool Balance-Report: T1-Gear + Attributpunkte vs. Düsterwald Bracket 1-10

**Datum:** 2026-07-14 (Teil 1-2), 2026-07-15 (Teil 3 Bracket 21-30, Teil 4 Bracket 31-40)
**Auftrag (Teil 1):** 1000 zufällige Builds mit ausschließlich Tier-1-Ausrüstung generieren, je mit 30 Schrein-Attributpunkten, gegen zufällige Step-Sequenzen aus Düsterwald-Monstern testen (je 10.000 Durchläufe pro Build), und beurteilen, wie balanced das Ganze ist.
**Auftrag (Teil 2, Nachtrag):** eine tatsächlich ansteigende Schwierigkeitskurve über die 7 Bracket-1-10-Monster kalibrieren, passend zur echten Level-Progression (0 Punkte bei Level 1, ca. 45-50 Punkte bei Level 10).
**Auftrag (Teil 3, Bracket 21-30):** die Veteranen-Übernahme (11-20 → 21-30) fertigstellen, danach mit mindestens 1000 zufälligen Builds (echte Level-Progression 21-30, gemischtes T1-3-Gear) je 10.000 Durchläufe eines 6-Kämpfe-Abenteuers gegen den vollen Bracket-21-30-Pool simulieren, das Balancing beurteilen und einen Bericht mit Vorschlägen schreiben.
**Auftrag (Teil 4, Bracket 31-40):** dasselbe Vorgehen wiederholen: Veteranen-Übernahme 21-30 → 31-40 fertigstellen, dann die nativen Bracket-31-40-Monster (T4-Gear) mit demselben Batch-Verfahren testen und balancen.

## TL;DR

- **Teil 1+2 (Bracket 1-10):** Ich habe dabei einen echten Bug im Kampf-Code gefunden, der Tode praktisch unmöglich gemacht hat — behoben. Nach dem Fix sah die Balance gesund aus (Ø Winrate 88,6 %, Ø Tod-Rate 11,3 %), danach wurde zusätzlich eine echte Schwierigkeitskurve über die 7 Monster kalibriert (Abschnitt 6). Neues Feature: Bracket-Wechsel-Toast im Dorf (Abschnitt 7).
- **Teil 3 (Bracket 21-30):** Die Veteranen-Übernahme von Bracket 11-20 nach 21-30 funktioniert (Abschnitt 11) und ist jetzt live. Der große Batch-Test deckte ein deutliches Balance-Problem bei den 7 NATIVEN Bracket-21-30-Monstern auf (nie auf die reale Level-Progression kalibriert, Abschnitt 12) — **Kalibrierung berechnet, erklärt und nach Bestätigung in `dark-forest.21-30.json` übernommen** (Abschnitt 13/17).
- **Teil 4 (Bracket 31-40):** Gleiches Muster wie 21-30, noch drastischer — alle 7 nativen Bracket-31-40-Monster waren bis Level 37 zu 100 % ungewinnbar (Abschnitt 21). Kalibrierung berechnet und angewendet (Abschnitt 22-23).
- **Teil 5 (Nachtrag, selber Tag):** Nutzer-Feedback nach dem Batch-Test deckte auf, dass Kämpfe trotz gesunder Winrate viel zu lange dauerten (20-90 Runden). Root Cause: Monster-Ausweichen ist über alle Brackets systematisch gestiegen, während Spieler-Glück (kein Schrein-Stat) immer bei 5 bleibt — plus ein Bug in meinen eigenen Checkpoint-Testfiguren (fehlende Handschuhe/Dual-Wield). Behoben, PLUS auf Nutzerwunsch Waffen-/Spell-Schaden in Tier 2-4 spielweit um 90 % angehoben (Abschnitt 29-30). Ein Nebeneffekt (2 Monster schossen dadurch auf absurd hohe attack-Werte hoch) wurde manuell nachjustiert (Abschnitt 31). **Alles bereits live**, finale Zahlen in Abschnitt 32.

---

## 1. Der Bug: Regeneration lief vor der Todes-Prüfung

### Was ich beobachtet habe

Beim ersten Testlauf (5-20 zufällige Builds, wenig Runs) gewannen **ausnahmslos alle** Builds zu 100 % — auch absichtlich schwache (kein Gear, keine Spells). Ich bin dem nachgegangen, weil eine derart perfekte 100 %-Quote über hunderte zufällige Stichproben statistisch praktisch unmöglich ist, wenn irgendein echtes Todesrisiko existiert.

Um das zu verifizieren, habe ich einen Charakter mit 0 Gear/0 Punkten (nur Start-Schwert) gegen die 7 Bracket-1-10-Monster getestet — inklusive eines Extremtests mit künstlich auf 200 hochgesetztem Monster-Angriffswert (Referenzwert: Spieler-HP 115, 0 Rüstung). Selbst dabei: **0 Tode in 200 Simulationen**, obwohl eine manuelle Nachrechnung derselben Würfel-Formeln zeigte, dass der Spieler nach spätestens 2 gelandeten Treffern bei 0 HP sein müsste.

### Ursache

In der Runden-Schleife wurde die HP-/Mana-Regeneration **im selben Codeblock direkt nach** dem Schaden des Monsters angewendet, aber **vor** der Prüfung, ob der Spieler dadurch gestorben ist:

```ts
// VORHER (Bug) — src/app/utils/fight-simulator.util.ts
applyDamageToPlayer(run, playerStats, monster, monster.attack || 10, 'physical');

// Regeneration lief hier IMMER, auch wenn playerHp gerade auf 0 gefallen war —
// ein tödlicher Treffer wurde in derselben Runde wieder "weggeheilt".
run.playerMana = Math.min(run.playerMaxMana, run.playerMana + Math.floor(playerStats['mana-regeneration'] ?? 0));
run.playerHp = Math.min(run.playerMaxHp, run.playerHp + Math.floor(playerStats['hp-regeneration'] ?? 0));
```

Da so gut wie jeder Charakter (schon ab Basis-Vitalität) einen positiven HP-Regen-Wert hat, wurde ein Treffer, der die HP auf 0 brachte, fast immer sofort wieder auf 1+ HP angehoben — die `while`-Schleifen-Bedingung (`run.playerHp > 0`) blieb dadurch fast immer erfüllt, und die äußere "bist du gestorben?"-Prüfung nach der Schleife griff praktisch nie.

Im **echten** `FightService` (`src/app/services/fight.service.ts`) existiert dieser Bug nicht, weil dort `applyDamageToPlayer()` selbst sofort `if (this.playerHp() <= 0) this.handleFightEnd(false)` auslöst — der Kampf endet in dem Moment, in dem die HP auf 0 fallen, nicht erst am Rundenende. Mein Port (`fight-simulator.util.ts`, gebaut für das `/fight-tool`) hatte diesen "sofort prüfen"-Schritt schlicht vergessen.

### Fix

Ein früher `break` direkt nach dem Schaden, vor der Regeneration:

```ts
// NACHHER (Fix)
applyDamageToPlayer(run, playerStats, monster, monster.attack || 10, 'physical');

// 🐛 Todes-Check MUSS vor der Regeneration passieren — sonst heilt der
// hp-regeneration-Tick eine tödliche Wunde in derselben Runde wieder auf 1+ HP.
if (run.playerHp <= 0) break;

run.playerMana = ...
run.playerHp = ...
```

**Betroffene und reparierte Dateien:**
- `src/app/utils/fight-simulator.util.ts` — der ECHTE Code hinter `/fight-tool`. Das heißt: **die "Wann bist du gestorben"-Auswertung im Fight-Tool war bislang selbst nicht verlässlich** (Tode wurden fast nie korrekt erkannt). Mit dem Fix funktioniert das jetzt wie beabsichtigt.
- `scripts/lib/fight-tool-sim-core.mjs` — die Node-Analyse-Bibliothek für dieses Batch-Skript (1:1 derselbe Fix).

---

## 2. Vorher/Nachher: derselbe Batch, unterschiedliches Ergebnis

| Metrik | Vor dem Fix | Nach dem Fix |
|---|---|---|
| Builds mit 100 % Winrate | 887 / 1000 (88,7 %) | 294 / 1000 (29,4 %) |
| Ø Winrate über alle Builds | 99,2 % | 88,6 % |
| Ø Tod-Rate | ~0 % (praktisch nie gemessen) | 11,3 % |
| Builds mit 0 % Winrate | 0 | 1 |
| Schwächste Builds scheitern an | fast nur "Timeout" (Rundenlimit, 0 % Tod) | primär an echtem Tod |

Der entscheidende Unterschied: **vorher endeten schwache Builds fast nie durch Tod, sondern durch das 100-Runden-Timeout** (können das Monster nicht schnell genug töten, sterben aber auch nicht) — genau das Symptom des Bugs. Nachher gibt es eine echte, glaubwürdige Verteilung mit echtem Sterberisiko.

---

## 3. Schwierigkeitskurve innerhalb des Brackets (Referenz-Charaktere)

Um die reinen Zufalls-Builds mit etwas Kontrollierterem zu ergänzen, habe ich zusätzlich 3 feste Referenz-Charaktere je **einzeln gegen jedes der 7 Bracket-1-10-Monster** getestet (3000 Runs pro Paarung):

| Charakter | Goblin | Waldläufer-Kobold | Wurzelhexe | Dornwolf | Zyklop | Zyklopen-Stammeswächter | Moosschrecken |
|---|---|---|---|---|---|---|---|
| Blutiger Anfänger (0 Punkte, nur Start-Schwert) | 93,5 % | 94,4 % | 99,3 % | 69,8 % | 29,9 % | 5,1 % | 7,0 % |
| Halbwegs ausgerüstet (4/8 Slots, 15 Punkte) | 99,9 % | 100 % | 100 % | 98,3 % | 94,6 % | 74,4 % | 75,6 % |
| Voll T1 ausgerüstet (8/8 Slots, 30 Punkte) | 100 % | 100 % | 100 % | 99,4 % | 99,4 % | 90,9 % | 92,7 % |

Das ergibt eine **sinnvolle, lesbare Kurve**: die ersten 3 Monster (HP 27-49) sind klar für einen frischen Level-1-Charakter gedacht und praktisch immer schaffbar. Die letzten beiden (Zyklopen-Stammeswächter, Moosschrecken, HP 127-132) sind spürbar härter und selbst mit voller T1-Ausrüstung nicht garantiert gewonnen (90-93 %) — das ist gutes, gesundes Design für das obere Ende eines Brackets.

---

## 4. Warum die schwächsten Zufalls-Builds verlieren — und warum das okay ist

In der Liste der schwächsten Builds (0-2 % Winrate) fällt ein klares Muster auf: fast alle stapeln mehrere Items mit "Splittern"-Namen (z.B. *Splitternder Knochenpanzer*, *Splitternde Knochenschienen*, *Splitternder Knochenring*).

Ich habe das nachgeprüft: diese Items sind **absichtlich als "verfluchte" Glaskanonen-Variante designt** — der Bildpfad von *Splitternder Knochenpanzer* heißt z.B. wörtlich `cursed-chest_1.webp`, und die Stats zeigen konsequent negative Werte (z.B. Glück -3, teils negative Resistenzen) gegen mehr Offensiv-Boni. Von den 5 Item-Archetypen pro Slot/Tier ist das der eine bewusst riskante.

Mein Zufalls-Build-Generator wählt pro Slot uniform aus allen T1-Items desselben Slots — er "weiß" nichts von dieser Archetyp-Unterscheidung. Ein Build, der durch Zufall gleich 3-4 dieser verfluchten Teile gleichzeitig zieht, häuft die negativen Resistenzen/Glück-Mali, ohne die Offensiv-Boni ausreichend zu nutzen (v.a. wenn dazu noch wenig Spells gewählt wurden) — genau die paar Builds, die bei 0-2 % Winrate liegen.

**Das ist kein Balance-Fehler**, sondern die Glaskanonen-Mechanik funktioniert wie vorgesehen: bewusst riskante Items können, gestapelt und ohne Ausgleich, tatsächlich zu einem schlechten Build führen. Ein echter Spieler, der diese Items bewusst (oder zufällig einzeln) trägt, hätte i.d.R. nicht gleich 3-4 davon gleichzeitig, oder würde gegensteuern (mehr Vitalität, defensive Spells).

---

## 5. Fazit Teil 1 (Stand vor der Kurven-Kalibrierung): keine Monster-/Item-Änderungen

Basierend auf den Zahlen nach dem Bugfix:

- 83,1 % aller 1000 zufälligen T1-Builds gewinnen mehr als 80 % ihrer Läufe.
- Die durchschnittliche Tod-Rate (11,3 %) ist ein gesundes, spürbares aber nicht erdrückendes Risiko.
- Die Schwierigkeitskurve *innerhalb* des Brackets (leicht → schwer) ist sinnvoll gestaffelt.
- Die schwächsten Ausreißer erklären sich vollständig durch die absichtliche Glaskanonen-Mechanik, nicht durch zu starke Monster.

An diesem Punkt hatte ich entschieden, keine Monster-/Item-Stats zu verändern — vor dem Bugfix sah es so aus, als bräuchte das Bracket einen deutlichen Monster-Buff (ich hatte testweise sogar mit +75-300 % Angriff/Glück kalibriert — selbst DAS reichte nicht gegen den Bug, ein klares Zeichen, dass das Problem nie in den Monster-Werten lag). Nach dem Fix schien der künstliche Buff nicht mehr nötig.

**Das war aber nur die halbe Antwort** — die eigentliche Anschlussfrage kam danach: sollen die Monster nicht nur "insgesamt gesund" sein, sondern eine ECHTE, spürbare Kurve über die Level-Progression bilden? Siehe Abschnitt 6.

---

## 6. Echte Schwierigkeitskurve kalibriert (0 → 45-50 Attributpunkte)

### Ausgangslage

Der Spieler startet bei Level 1 mit 0 Attributpunkten; pro Level-up gibt's 5 Punkte (`STAT_POINTS_PER_LEVEL` in `src/app/services/profile.service.ts`), macht bei Level 10 ca. 45 Punkte. Die Monster-Auswahl innerhalb eines Brackets ist aber komplett zufällig (`Area.getRandomMonster()`/`populateFights()` in `src/app/classes/adventure/area.class.ts`) — **unabhängig vom aktuellen Level**. Ein Level-1-Charakter kann also im ersten Kampf direkt das härteste Monster des ganzen Brackets ziehen.

### Vorgehen

1. Die 7 Monster wurden nach ihrer **gemessenen** Ist-Schwierigkeit sortiert (Winrate einer festen 0-Punkte-Referenzfigur dagegen) — NICHT nach rohen HP-Werten, weil hohe HP allein irreführt: mehr HP heißt mehr Runden heißt mehr Trefferchancen fürs Monster, macht es also auch bei moderatem `attack` gefährlicher, als der HP-Wert vermuten lässt (das kam beim ersten Versuch mit HP-Sortierung heraus und hat die Kurve verzerrt — Zyklop mit riesigem HP-Pool wurde durch reine HP-Sortierung in der Mitte der Kurve einsortiert, obwohl es schon bei aktuellen Werten gefährlicher war als sein HP-Rang vermuten ließ).
2. Jedes Monster bekam einen festen **Checkpoint** zugeordnet: Attributpunkte + passend wachsende Menge T1-Gear, gleichmäßig verteilt von "0 Punkte, nur Start-Schwert" bis "50 Punkte, komplett T1 ausgerüstet" (Checkpoints: 0/8/17/25/33/42/50 Punkte, 0/1/3/4/5/7/8 Gear-Slots).
3. Der `attack`-Wert jedes Monsters wurde iterativ so angepasst, dass die zugeordnete Checkpoint-Figur eine Ziel-Winrate von ~78 % erreicht (Skript: `scripts/fight-tool-monster-curve-calibration.mjs`).
4. **Wichtig**: die 78 % sind KEIN dynamisches Rescaling, das sich laufend an den jeweils kämpfenden Spieler anpasst — es ist nur das Werkzeug, um beim Kalibrieren den richtigen FESTEN Zahlenwert zu finden. Danach steht der Wert fest in der JSON. Ein 0-Punkte-Charakter, der zufällig ein für höhere Punkte kalibriertes Monster zieht, hat entsprechend eine niedrigere Gewinnchance — echte, spürbare Härte, kein Ausgleich.
5. Validiert wurde NICHT der rohe `attack`-Wert (der bleibt wegen der HP-Effekte aus Punkt 1 nicht zwingend monoton), sondern die **gefühlte** Schwierigkeit: zwei feste Sonden-Figuren (0-Punkte-Anfänger, 50-Punkte-voll-ausgerüstet) gegen alle 7 kalibrierten Monster in Reihenfolge — die Winrate muss dabei fallen.

### Ergebnis

| Monster | HP | Checkpoint | attack vorher → nachher |
|---|---|---|---|
| Wurzelhexe | 32 | 0 Pkt / Start-Schwert | 12 → 34 |
| Waldläufer-Kobold | 27 | 8 Pkt / 1 Gear-Slot | 18 → 30 |
| Goblin | 49 | 17 Pkt / 3 Gear-Slots | 23 → 42 |
| Dornwolf | 42 | 25 Pkt / 4 Gear-Slots | 29 → 40 |
| Zyklop | 113 | 33 Pkt / 5 Gear-Slots | 30 → 34 |
| Moosschrecken | 127 | 42 Pkt / 7 Gear-Slots | 28 → 64 |
| Zyklopen-Stammeswächter | 132 | 50 Pkt / 8 Gear-Slots (voll T1) | 31 → 75 |

Gefühlte Schwierigkeit nach der Kalibrierung, Monster 1→7 in obiger Reihenfolge:

- **0-Punkte-Anfänger:** 91 % → 77 % → 58 % → 43 % → 20 % → 0 % → 0 % — fällt sauber durchgehend.
- **50-Punkte-voll ausgerüstet:** 100 % → 100 % → 100 % → 100 % → 100 % → 87 % → 82 % — frühe Monster trivial (spürbarer Fortschritt!), die letzten beiden bleiben selbst am Ende des Brackets eine echte Herausforderung.

⚠️ **Bekannte Einschränkung**: da die Monster-Auswahl weiterhin komplett zufällig ist (siehe "Ausgangslage" oben), hat ein ganz frischer Level-1-Charakter theoretisch eine 1-in-7-Chance, gleich im ersten Kampf eines der beiden härtesten (jetzt: für 42-50 Punkte kalibrierten) Monster zu ziehen — mit ~0 % Gewinnchance. Das war vorher genauso der Fall (5-7 % statt 0 %, kaum besser), ist aber KEIN Teil dieser Kalibrierung behoben worden — falls gewünscht, wäre der nächste Schritt, die Monster-Auswahl selbst ans Spieler-Level zu koppeln (echte Mechanik-Änderung, separat zu besprechen).

Auswirkung auf den Teil-1-Batch (1000 zufällige Builds, weiterhin pauschal 30 Punkte gegen ein zufällig gezogenes Monster aus dem GANZEN Bracket): Ø Winrate sinkt von 88,6 % auf 63,1 %, Ø Tod-Rate steigt von 11,3 % auf 36,8 % — das ist der **erwartete** Effekt, kein Rückschritt: 30 Punkte liegen zwischen den mittleren Checkpoints, gegen die beiden jetzt bewusst harten Endgegner (kalibriert für 42-50 Punkte) ist ein 30-Punkte-Charakter also absichtlich im Nachteil.

---

## 7. Neues Feature: Bracket-Wechsel-Hinweis im Dorf

Wenn der Charakter seit dem letzten Dorf-Besuch in ein neues Monster-Bracket aufgestiegen ist (z.B. Level 10→11 = Bracket 1-10 → 11-20), erscheint beim nächsten Betreten des Dorfs ein kurzer, nicht-blockierender Toast oben im Bild ("⚔️ Neues Gebiet erreicht! Monster der Stufe 11-20 warten jetzt im Düsterwald."), der nach ca. 4,6 Sekunden automatisch wieder ausblendet.

**Neue Dateien:**
- `src/app/services/bracket-notification.service.ts` — vergleicht beim Dorf-Betreten das aktuelle Bracket (`getLevelBracket(profile.level())`) mit dem zuletzt gespeicherten (`${charId}_lastSeenBracket` in LocalStorage, analog zu den übrigen `${charId}_*`-Keys). Bei neuem Charakter (noch kein gespeicherter Wert) wird nur der Ausgangswert gemerkt, OHNE den Toast auszulösen.
- `src/app/components/shared/bracket-change-toast/` — die Toast-Komponente selbst (Tailwind-Styling im `panel-grim`/`heading-grim`-Look, wie der Rest der App).

**Geänderte Dateien:**
- `src/app/components/village-scene/village-scene.ts`/`.html` — ruft `checkForBracketChange()` in `ngOnInit()` auf (nachdem das Dorf-Bild geladen ist) und rendert `<app-bracket-change-toast />`.

---

## 8. Veteran-Monster: alte Bracket-Monster kommen hochskaliert mit

Auf Wunsch: beim Bracket-Wechsel verschwindet der vorherige Monster-Pool nicht komplett, sondern die 7 Monster des UNMITTELBAR vorherigen Brackets kommen als "Veteran"-Varianten mit dazu (nicht kumulativ — Bracket 21-30 bekommt nur 11-20 mit, nicht zusätzlich 1-10).

**Methode** (`scripts/monster-carry-over.mjs`):
1. HP/Rüstung/Ausweichen/Glück/Krit-Chance/Resistenzen/EXP werden per Verhältnis skaliert: `Ø-Wert im Ziel-Bracket / Ø-Wert im Quell-Bracket`, angewendet auf jedes einzelne übernommene Monster.
2. `attack` wird — wie bei Abschnitt 6 — per Simulation gegen bracket-passende Checkpoints (Punktespanne + T-Gear-Tier des Ziel-Brackets) neu kalibriert, nicht einfach mitskaliert.
3. Neue IDs (`..._veteran`) und Namen (`... (Veteran)`) verhindern Kollisionen mit den nativen Monstern.

**Ergebnis: nur Bracket 11-20 (← 1-10) ist umgesetzt.** Die Kurve dort validiert sauber:

| | Monster 1→7 (Reihenfolge nach Ist-Schwierigkeit) |
|---|---|
| Kurve @50 Punkte (Bracket-Start) | 84% → 53% → 36% → 24% → 5% → 1% → 0% |
| Kurve @100 Punkte (Bracket-Ende) | 100% → 100% → 100% → 100% → 100% → 94% → 80% |

**Bracket 21-30, 31-40 und 41-50 wurden bewusst NICHT umgesetzt** — die Verhältnis-Skalierung schaukelt sich über mehrere Brackets so auf, dass einzelne Monster-HP-Werte am Ende so hoch werden, dass selbst der niedrigste mögliche `attack`-Wert (1) die Referenzfigur nicht auf die Ziel-Winrate bringt (die Kämpfe laufen ins 100-Runden-Timeout statt in Sieg/Niederlage — ein Grenzfall, weil der Kalibrator nur `attack` als Stellschraube kennt, hier aber auch die HP mit angepasst werden müsste). Bei einem Testlauf kam z.B. bei Bracket 41-50 ein Ausreißer von `attack: 433` für ein einzelnes Monster heraus — klar nicht verwendbar. Diese drei Brackets bräuchten einen verbesserten Kalibrator (HP + Attack gemeinsam lösen), der noch nicht gebaut wurde.

**Neue/geänderte Dateien:**
- `scripts/monster-carry-over.mjs` — Kalibrierungs-Skript (aktuell nur für 11-20←1-10 sauber nutzbar; die Bracket-Konfiguration für 21-30/31-40/41-50 steht schon drin, produziert aber wie beschrieben noch keine brauchbaren Ergebnisse).
- `public/mosters/dark-forest/dark-forest.11-20.veteran.json` — die 7 hochskalierten Veteran-Monster.
- `src/app/classes/adventure/areas/dark-forest.class.ts` — `MONSTER_POOLS['11-20']` verbindet jetzt native + Veteran-Monster (14 statt 7).

⚠️ Dieselbe Einschränkung wie in Abschnitt 6: die Monster-Auswahl bleibt komplett zufällig aus dem GESAMTEN (jetzt 14 Monster großen) Pool — ein frischer Bracket-11-20-Charakter kann theoretisch sofort ein für 100 Punkte kalibriertes Veteran-Monster ziehen.

---

## 9. Was sich am Code geändert hat (Gesamtübersicht)

| Datei | Änderung |
|---|---|
| `src/app/utils/fight-simulator.util.ts` | **Bugfix**: Todes-Check vor Regeneration (siehe Abschnitt 1). Betrifft das echte `/fight-tool`. |
| `scripts/lib/fight-tool-sim-core.mjs` | Neu: gemeinsame, Angular-freie Stat-/Kampf-Logik für alle Balance-Skripte (derselbe Fix). |
| `scripts/fight-tool-balance-sim.mjs` | Neu: generiert N zufällige T1-Builds, simuliert je M Runs gegen zufällige Bracket-1-10-Step-Sequenzen, aggregiert Winrate-Verteilung. |
| `scripts/fight-tool-baseline-check.mjs` | Neu: 3 feste Referenz-Charaktere einzeln gegen jedes der 7 Bracket-1-10-Monster (die Schwierigkeitskurve aus Abschnitt 3). |
| `scripts/fight-tool-monster-curve-calibration.mjs` | Neu: kalibriert die `attack`-Werte der 7 Bracket-1-10-Monster auf eine ansteigende Checkpoint-Kurve (Abschnitt 6). `--apply`-Flag schreibt in die echte JSON, ohne Flag nur Trockenlauf. |
| `scripts/monster-carry-over.mjs` | Neu: skaliert Monster des vorherigen Brackets hoch für den Folge-Bracket (Abschnitt 8) — aktuell nur 11-20←1-10 nutzbar. |
| `public/mosters/dark-forest/dark-forest.1-10.json` | **Geändert**: `attack`-Werte aller 7 Monster kalibriert (siehe Tabelle in Abschnitt 6). |
| `public/mosters/dark-forest/dark-forest.11-20.veteran.json` | Neu (Abschnitt 8). |
| `src/app/classes/adventure/areas/dark-forest.class.ts` | Geändert: `MONSTER_POOLS['11-20']` bindet die Veteran-Monster mit ein (Abschnitt 8). |
| `src/app/services/bracket-notification.service.ts` | Neu (Abschnitt 7). |
| `src/app/components/shared/bracket-change-toast/` | Neu (Abschnitt 7). |
| `src/app/components/village-scene/village-scene.ts`/`.html` | Geändert: bindet den neuen Toast ein (Abschnitt 7). |
| Alle Item-JSONs | **Unverändert**. |

## 11. Bracket 21-30: Veteranen-Übernahme (11-20 → 21-30) fertiggestellt

Der in Abschnitt 8 offen gelassene Fall — `scripts/monster-carry-over.mjs` hatte für Bracket 21-30 (und 31-40/41-50) beim letzten Testlauf keine brauchbaren Ergebnisse geliefert — wurde erneut ausgeführt, um zu prüfen, ob das Problem noch besteht.

**Ergebnis: Bracket 21-30 ← 11-20 konvergiert diesmal sauber.** Alle 7 hochskalierten Veteranen-Monster erreichen ihre Checkpoint-Winrate innerhalb der Toleranz (74-82 %, Ziel 78 %), und die gefühlte Kurve fällt/steigt sauber monoton:

| | Monster 1→7 (Reihenfolge nach Ist-Schwierigkeit) |
|---|---|
| Kurve @100 Punkte (Bracket-Start) | 60 % → 18 % → 1 % → 0 % → 0 % → 0 % → 0 % |
| Kurve @150 Punkte (Bracket-Ende, volles T3-Gear) | 100 % → 100 % → 100 % → 100 % → 100 % → 100 % → 83 % |

(**31-40 und 41-50 bleiben weiterhin unbrauchbar** — z.B. Bracket 41-50 erzeugt noch immer einen `attack: 434`-Ausreißer und eine komplett flache 0%-Kurve am unteren Ende. Nicht Teil dieses Auftrags, aber weiterhin offen — siehe Abschnitt 16.)

**Übernommen:**
- `public/mosters/dark-forest/dark-forest.21-30.veteran.json` — die 7 hochskalierten Veteranen (Sumpfhexe, Waldläufer-Kobold, Goblin, Dornwolf, Zyklop, Zyklopen-Stammeswächter, Moosschrecken → alle "(Veteran)").
- `src/app/classes/adventure/areas/dark-forest.class.ts` — `MONSTER_POOLS['21-30']` bindet jetzt native (7) + Veteranen (7) = **14 Monster** ein, analog zu Bracket 11-20.

Bracket 21-30 hat damit ab sofort die gleiche "vertraute Gegner kommen hochskaliert mit"-Erfahrung wie Bracket 11-20.

---

## 12. Bracket 21-30: Baseline-Check deckt ein echtes Balance-Problem auf

Bevor der große Zufalls-Batch lief, wurden 7 feste Checkpoint-Referenzcharaktere (Level 21, 100 Punkte, kaum Gear → Level 30, 145 Punkte, volles T3-Gear — echte Level-Progression) einzeln gegen alle 14 Bracket-21-30-Monster getestet (`scripts/fight-tool-baseline-check-21-30.mjs`, 3000 Runs/Paarung). Das Ergebnis war eindeutig:

| Charakter | Orc-Plünderer | Nachtklingen-Ass. | Nekromant-Lehrl. | Klauenpanther | Steinriese | Orc-Kriegshäuptl. | Blutmoor-Schr. |
|---|---|---|---|---|---|---|---|
| Level 21 (100 Pkt, kaum Gear) | 0,0 % | 0,0 % | 1,5 % | 0,0 % | 0,0 % | 0,0 % | 0,0 % |
| Level 25 (120 Pkt, T2, 4 Slots) | 3,4 % | 6,1 % | 56,7 % | 0,3 % | 0,0 % | 0,0 % | 0,0 % |
| Level 27 (130 Pkt, T2/T3, 5 Slots) | 52,7 % | 36,8 % | 100 % | 16,0 % | 0,1 % | 0,0 % | 0,0 % |
| Level 29 (140 Pkt, T3, 7 Slots) | 99,7 % | 97,8 % | 100 % | 69,2 % | 28,7 % | 44,9 % | 68,2 % |
| Level 30 (145 Pkt, volles T3) | 100 % | 100 % | 100 % | 96,3 % | 97,1 % | 98,6 % | 99,9 % |

**6 der 7 nativen Monster sind bis weit über die Bracket-Mitte hinaus praktisch ungewinnbar**, und werden erst in den letzten 1-2 Leveln des Brackets (Level 29-30, quasi volles T3-Gear) beherrschbar — ein Cliff-Edge-Sprung von 0 % auf 90-100 % innerhalb weniger Level, statt einer graduellen Kurve. Nur *Nekromanten-Lehrling* liegt schon früh in einem vernünftigen Bereich.

Zum Vergleich: die Veteranen-Monster (bereits in Abschnitt 11 kalibriert) zeigen genau die erwartete graduelle Kurve — z.B. Sumpfhexe (Veteran) 60→97→100 % über Level 21→24→25, Wurzelschrecken (Veteran) als härtester Veteran bleibt bis Level 29 bei 0-17 %.

**Ursache**: Anders als Bracket 1-10 (Abschnitt 6) wurden die 7 nativen Bracket-21-30-Monster nie mit der Checkpoint-Kalibrierungsmethode auf die reale Level-Progression abgestimmt — ihre `attack`-Werte stammen unverändert aus der ursprünglichen `generate-monsters.mjs`-Erstellung.

---

## 13. Kalibrierung der nativen Bracket-21-30-Monster

Gleiche Methode wie Abschnitt 6 (Bracket 1-10) und Abschnitt 11 (Veteranen 21-30), neu implementiert in `scripts/fight-tool-monster-curve-calibration-21-30.mjs`: Monster werden nach **gemessener** Ist-Schwierigkeit sortiert (Winrate der Level-21-Referenzfigur, unkalibriert) und je einem Checkpoint zugeordnet (Level 21/100 Pkt bis Level 30/145 Pkt, Gear-Tier wächst T1→T3 mit, siehe Tabelle), `attack` wird iterativ auf ~78 % Ziel-Winrate am zugeordneten Checkpoint angepasst.

| Monster | HP | Checkpoint | attack vorher → nachher | Winrate danach |
|---|---|---|---|---|
| Nekromanten-Lehrling | 182 | Lv21 / 100 Pkt / T1, 0 Slots | 31 → 29 | 78,8 % |
| Nachtklingen-Assassine | 154 | Lv22 / 105 Pkt / T1, 1 Slot | 50 → 21 | 74,7 % |
| Orc-Plünderer | 280 | Lv24 / 115 Pkt / T2, 3 Slots | 62 → 33 | 74,6 % |
| Klauenpanther | 238 | Lv25 / 120 Pkt / T2, 4 Slots | 78 → 30 | 78,2 % |
| Steinriese | 644 | Lv27 / 130 Pkt / T3, 5 Slots | 81 → 39 | 76,0 % |
| Orc-Kriegshäuptling | 756 | Lv29 / 140 Pkt / T3, 7 Slots | 84 → 54 | 78,9 % |
| Blutmoor-Schrecken | 728 | Lv30 / 145 Pkt / T3, volles Gear | 74 → 68 | 81,5 % |

Gefühlte Schwierigkeit nach Kalibrierung, Monster 1→7 in obiger Reihenfolge:
- **Level 21 (Bracket-Einstieg):** 78 % → 73 % → 10 % → 6 % → 0 % → 0 % → 0 % — fällt sauber, und anders als vorher (Abschnitt 12) hat die Referenzfigur jetzt bei den ERSTEN beiden Monstern eine faire Chance statt bei praktisch allen.
- **Level 30 (voll T3 ausgerüstet):** 100 % → 100 % → 100 % → 100 % → 100 % → 100 % → 84 % — die letzten beiden bleiben bewusst harte Bracket-Ende-Gegner, exakt das gleiche Muster wie bei Bracket 1-10 (Zyklopen-Stammeswächter/Moosschrecken) und den Veteranen 11-20/21-30.

**Wichtig**: `Orc-Kriegshäuptling` und `Blutmoor-Schrecken` bleiben absichtlich die härtesten Monster im Bracket (Checkpoints Level 29/30) — sie sollen erst gegen Bracket-Ende zuverlässig fallen, nicht vorher. Das ist Design, kein Rest-Bug.

✅ **Übernommen** (`node scripts/fight-tool-monster-curve-calibration-21-30.mjs --apply`, nach Rückfrage bestätigt) — `dark-forest.21-30.json` enthält jetzt diese 7 `attack`-Werte. Nur `attack` wurde geändert, alle anderen Stats (HP, Rüstung, Ausweichen, Glück, Krit, Resistenzen, EXP) blieben unangetastet.

---

## 14. Großer Batch-Test: 1000 Builds × 10.000 Runs × 6 Kämpfe (Vorher/Nachher)

**Methodik** (`scripts/fight-tool-balance-sim-21-30.mjs`): 1000 zufällige Builds mit **echter Level-Progression** (Level 21-30 gleichverteilt gewürfelt, Attributpunkte = (Level-1)×5, also 100-145 Punkte — `STAT_POINTS_PER_LEVEL=5` aus `profile.service.ts`) und **gemischtem T1/T2/T3-Gear** (pro Slot 85 % Ausrüstungs-Chance, Tier gleichverteilt 1-3 — passend zu `TIER_DISTRIBUTION['21-30']`, die im echten Spiel ebenfalls gleichgewichtet T1/T2/T3 droppt). Jeder Build durchläuft **ein Abenteuer mit fest 6 Monster-Kämpfen** — das ist zugleich die vom Auftrag geforderte Mindestanzahl UND das reale Maximum, das `Area.generateSteps()` in einem einzelnen Abenteuer überhaupt erzeugen kann (stepCount 4-8, fightCount = 50-75 % davon → max. 6 bei stepCount 8). HP/Mana/Schild werden — wie im echten Spiel — zwischen den 6 Kämpfen NICHT zurückgesetzt. Jeder Build wurde 10.000 Mal wiederholt gegen den vollen 14-Monster-Pool (7 nativ + 7 Veteranen, zufällig gezogen).

Zwei komplette Durchläufe: einmal gegen die **aktuellen** (unkalibrierten) nativen Monster-Werte, einmal mit den in Abschnitt 13 vorgeschlagenen **kalibrierten** Werten (per `--calibrated`-Flag, überschreibt nur `attack` der 7 nativen Monster im Speicher, ohne die JSON anzufassen).

### Gesamtergebnis

| Metrik | Vorher (aktuell) | Nachher (kalibriert) |
|---|---|---|
| Ø Winrate über alle 1000 Builds | 16,5 % | 19,4 % |
| Ø Tod-Rate | 62,5 % | 51,3 % |
| Ø Timeout-Rate (100-Runden-Cap) | 21,0 % | 29,4 % |
| Builds mit 0 % Winrate | 634 (63,4 %) | 606 (60,6 %) |
| Builds mit 100 % Winrate | 24 (2,4 %) | 33 (3,3 %) |
| Winrate Level 21-23 | 14,5 % | 18,1 % |
| Winrate Level 24-27 | 15,8 % | 16,7 % |
| Winrate Level 28-30 | 19,5 % | 24,2 % |

### Pro-Monster (über alle 6×10.000×1000 Einzelkämpfe, nicht ganze Runs)

| Monster | Vorher | Nachher | Δ |
|---|---|---|---|
| Blutmoor-Schrecken (nativ) | 29,6 % | 32,8 % | +3,2 |
| Wurzelschrecken (Veteran, unverändert) | 34,7 % | 36,8 % | +2,1 (Rausch-Streuung) |
| Orc-Kriegshäuptling (nativ) | 34,7 % | 40,9 % | +6,2 |
| Trollwächter (Veteran, unverändert) | 46,0 % | 43,0 % | −3,0 (Rausch-Streuung) |
| Klauenpanther (nativ) | 57,8 % | 86,4 % | **+28,6** |
| Steinriese (nativ) | 58,3 % | 77,9 % | **+19,6** |
| Nachtklingen-Assassine (nativ) | 73,7 % | 82,0 % | +8,3 |
| Orc-Plünderer (nativ) | 79,4 % | 88,2 % | +8,8 |
| Nekromanten-Lehrling (nativ) | 80,5 % | 79,9 % | −0,6 (war schon kalibriert-nah) |
| Höhlentroll/Klingenspinne/Schattenläufer/Goblin-Plünderer/Sumpfhexe (Veteran, unverändert) | 79-90 % | 73-88 % | ±3-6 (Rausch-Streuung) |

Die Veteranen-Zeilen ändern sich nicht, weil `--calibrated` nur die native JSON überschreibt — ihre ±3-6-Punkte-Schwankung zwischen den zwei Durchläufen zeigt die normale Stichproben-Streuung zwischen zwei unabhängigen 1000-Build-Zufallsstichproben. Die Verbesserungen bei den nativen Monstern (v.a. Klauenpanther +28,6, Steinriese +19,6) liegen weit außerhalb dieser Streuung — ein echtes Signal, keine Zufälligkeit.

### Warum die Gesamt-Winrate trotz klarer Einzel-Verbesserung "nur" von 16,5 % auf 19,4 % steigt

Das ist **kein Zeichen, dass die Kalibrierung nicht wirkt** — es liegt an der Aufgabenstellung selbst: ein Build muss **6 Kämpfe in Folge ohne Reset** gewinnen, gegen zufällig aus 14 Monstern gezogene Gegner, bei denen 2 (Orc-Kriegshäuptling, Blutmoor-Schrecken) bewusst erst gegen Bracket-Ende fair sind UND die Monsterauswahl komplett unabhängig vom Spieler-Level ist (bekannte, bereits in Abschnitt 6/8 dokumentierte Einschränkung — siehe auch Abschnitt 16). Selbst bei fairen 80 % Einzelkampf-Winrate ergibt 6 Kämpfe in Folge nur 0,8⁶ ≈ 26 %; zieht der Run dazu noch 1-2 Mal einen der zwei bewusst-harten Bracket-Ende-Monster früh (was bei zufälliger Ziehung regelmäßig passiert), sinkt die Chance weiter. Die Pro-Monster-Zahlen oben sind der aussagekräftigere Gradmesser für "ist ein einzelnes Monster fair" — und dort ist die Verbesserung eindeutig.

---

## 15. Item-/Build-Analyse (was Builds stark oder schwach macht)

Zusätzliche Auswertung der 1000 Build-Ergebnisse (vorher wie nachher, Muster ist in beiden Durchläufen gleich):

- **Ausrüstungsgrad korreliert stark mit Winrate**: Builds mit nur 4-6 belegten Slots liegen bei 0-5,5 % Winrate, mit vollen 9-10 Slots (inkl. zwei Waffen/Ringe) bei 26-30 %. Das ist erwartetes, gesundes Verhalten — vollständig ausgerüstete Charaktere sollen klar stärker sein.
- **Verfluchte ("Splitternde") Items spielen hier eine kleinere Rolle als in Bracket 1-10**: schwächste 100 Builds tragen im Schnitt 0,5-0,56 verfluchte Items, stärkste 100 nur 0,25-0,27 — ein Effekt, aber deutlich schwächer als in Abschnitt 4 (dort war es der dominante Faktor für die schwächsten Ausreißer). In Bracket 21-30 ist die schiere Monster-Härte der weit größere Faktor.
- **Spell-Anzahl korreliert NICHT klar mit Winrate** (0 Spells: 9,5-18,8 %, 1 Spell: 21-24 %, 4 Spells: 15,7-16,7 % — kein sauberer Trend). Die Kampf-KI (`pickPlayerAction`) nutzt immer den ERSTEN bezahlbaren Spell in Ausrüstungs-Reihenfolge, unabhängig von dessen Schadenshöhe — mehr Spells bringen also nur dann etwas, wenn die zufällige Reihenfolge zufällig einen starken Spell nach vorne stellt. Kein akuter Balance-Fehler, aber ein Hinweis, dass eine "bester verfügbarer Spell zuerst"-Priorisierung in der echten `FightService`-KI (falls sie das nicht ohnehin schon tut) mehr aus Spell-Investition rausholen würde.

---

## 16. Bekannte Limitationen dieser Testmethodik

- **Monster-Auswahl ist weiterhin komplett zufällig, unabhängig vom Spieler-Level** (`Area.getRandomMonster()`/`populateFights()`) — wie schon in Abschnitt 6/8 festgehalten, nicht Teil dieses Auftrags. Für Bracket 21-30 mit jetzt 14 Monstern (2 davon bewusst bracket-ende-hart) verstärkt das den in Abschnitt 14 beschriebenen Effekt.
- **Tränke werden in der Simulation nicht berücksichtigt** — `FightService.consumePotionTurn()` existiert im echten Spiel (Spieler können während eines Kampfs Heil-/Mana-/Buff-Tränke einsetzen), aber keines der Fight-Tool-Batch-Skripte (auch nicht die von Bracket 1-10) modelliert das. Die gemessenen Winrate-Zahlen sind dadurch eine **pessimistische Untergrenze** — ein echter Spieler mit Tränken im Inventar dürfte in der Praxis etwas besser abschneiden als hier gemessen, v.a. bei den langen 6-Kämpfe-Gauntlets ohne Reset.
- **Bracket 31-40 und 41-50 haben weiterhin keine funktionierende Veteranen-Übernahme** (Abschnitt 11) und wurden auch nicht auf die Level-Kurve kalibriert (nur 1-10 und jetzt 21-30) — beides expliziter Auftrags-Scope für heute war nur Bracket 21-30.
- **Kampf-KI-Reihenfolge**: siehe Abschnitt 15, Spells werden nicht nach Schadenshöhe priorisiert, nur nach Ausrüstungs-Slot-Reihenfolge.

---

## 17. Balancing-Empfehlungen (Zusammenfassung)

1. ✅ **Umgesetzt: die in Abschnitt 13 berechnete Kalibrierung der 7 nativen Bracket-21-30-Monster wurde übernommen** (`node scripts/fight-tool-monster-curve-calibration-21-30.mjs --apply`, nach Rückfrage bestätigt). Datenlage war eindeutig: vor der Änderung waren 6 von 7 native Monster bis Level 27-29 praktisch ungewinnbar (Abschnitt 12), die kalibrierten Werte beheben das nachweisbar (Abschnitt 14) ohne die beiden gewollt-harten Bracket-Ende-Gegner zu entschärfen.
2. Veteranen-Übernahme 21-30 ← 11-20 ist bereits live (Abschnitt 11), keine weitere Aktion nötig.
3. Kein Item-Balancing-Eingriff empfohlen — der in Abschnitt 15 gemessene Effekt verfluchter Items ist moderat und beabsichtigt (Glaskanonen-Mechanik, siehe Abschnitt 4), die Monster-Kalibrierung ist der Hebel mit der weitaus größeren Wirkung.
4. Als separates, größeres Folge-Thema (nicht heute umgesetzt, nur zur Erwägung): die in Abschnitt 16 genannte level-unabhängige Zufalls-Monsterauswahl ist mittlerweile in JEDEM Bracket eine wiederkehrende Fußnote in diesem Report. Falls das störend spürbar wird, wäre eine level-gewichtete Monsterauswahl (z.B. frühe Bracket-Level ziehen bevorzugt aus den leichteren Checkpoints) eine echte Mechanik-Änderung, die separat zu besprechen wäre.

---

## 18. Datei-Änderungen (Bracket-21-30-Arbeit, Teil 3)

| Datei | Änderung |
|---|---|
| `scripts/fight-tool-baseline-check-21-30.mjs` | Neu: 7 Checkpoint-Referenzcharaktere (Level 21-30) x 14 Monster, analog Abschnitt 3. |
| `scripts/fight-tool-monster-curve-calibration-21-30.mjs` | Neu: Kalibriert `attack` der 7 nativen Bracket-21-30-Monster (Abschnitt 13). `--apply` schreibt in die echte JSON — **ausgeführt**. |
| `scripts/fight-tool-balance-sim-21-30.mjs` | Neu: 1000×10000-Batch mit echter Level-Progression + T1-3-Gear-Mix + 6-Kämpfe-Abenteuer, `--calibrated`-Flag für den Vorher/Nachher-Vergleich (Abschnitt 14). |
| `public/mosters/dark-forest/dark-forest.21-30.veteran.json` | Neu (via `scripts/monster-carry-over.mjs`, Abschnitt 11). |
| `public/mosters/dark-forest/dark-forest.21-30.json` | **Geändert**: `attack`-Werte aller 7 nativen Monster kalibriert (Tabelle in Abschnitt 13), alle anderen Stats unverändert. |
| `src/app/classes/adventure/areas/dark-forest.class.ts` | Geändert: `MONSTER_POOLS['21-30']` bindet native + Veteranen-Monster ein (Abschnitt 11). |
| `scripts/output/fight-tool-baseline-report-21-30.json`, `fight-tool-monster-curve-calibration-21-30.json`, `fight-tool-balance-report-21-30.json`, `fight-tool-balance-report-21-30-calibrated.json` | Neu: Rohdaten aller Testläufe aus Teil 3. |

---

⚠️ **Hinweis:** Die Zahlen in Abschnitt 22-23 unten stammen aus einem ZWISCHENSTAND. Der Batch-Test in Abschnitt 23 deckte ein tieferliegendes Problem auf (Rundenlänge blieb trotz korrekter Winrate zu hoch), das in Abschnitt 29+ behoben wurde — dort stehen die AKTUELLEN, tatsächlich angewendeten Werte. Abschnitt 22-23 als Zwischenschritt/Herleitung stehen gelassen, nicht als finaler Stand lesen.

## 20. Bracket 31-40: Veteranen-Übernahme (21-30 → 31-40) + verbesserter Kalibrator

Gleicher Auftrag wie Teil 3, jetzt für Bracket 31-40 (Quelle: die frisch kalibrierten nativen 21-30-Monster aus Abschnitt 13). Beim ersten Testlauf zeigte sich sofort das in Abschnitt 8 vorhergesagte Problem konkret: **`Nachtklingen-Assassine (Veteran)`** (Checkpoint 150 Punkte/0 Gear) erreichte selbst mit `attack: 1` nur 6,9 % Winrate statt der Ziel-78 % — die per Verhältnis hochskalierte HP (×1,50 aus dem HP-Mittelwert-Verhältnis 31-40/21-30) war für die schwächste Checkpoint-Figur schlicht zu viel, der Kampf lief ins 100-Runden-Timeout statt in einen Sieg. `attack` allein kann das nicht lösen — es senkt nur den Schaden GEGEN den Spieler, nicht die Zeit bis zum Sieg.

**Fix: zweiter Kalibrierungs-Hebel (HP) in `scripts/monster-carry-over.mjs` ergänzt** (jetzt als geteilte Funktion `calibrateMonsterAttackAndHp` in `scripts/lib/fight-tool-sim-core.mjs`, von `monster-carry-over.mjs` UND den neuen 31-40-Skripten genutzt): wenn `attack`-Tuning allein die Ziel-Winrate nicht erreicht UND die Winrate zu NIEDRIG bleibt (Symptom: Checkpoint-Figur verliert trotz minimalem Monster-Schaden), wird die HP in Schritten von 15 % gesenkt (bis maximal 50 % der ursprünglich skalierten HP) und `attack` danach neu kalibriert. Ergebnis nach dem Fix:

| | Monster 1→7 (Reihenfolge nach Ist-Schwierigkeit) |
|---|---|
| Kurve @150 Punkte (Bracket-Start) | 60 % → 0 % → 0 % → 0 % → 0 % → 0 % → 0 % |
| Kurve @200 Punkte (Bracket-Ende, volles T4-Gear) | 100 % → 100 % → 100 % → 100 % → 100 % → 100 % → 80 % |

`Nachtklingen-Assassine (Veteran)` landet jetzt bei 62 % Winrate an ihrem Checkpoint (HP von 174 auf 116 gesenkt, `attack` auf 3) — noch unter der 78-%-Zielmarke, aber ein klar spielbarer, kein unmöglicher Kampf mehr. Alle anderen 6 Veteranen konvergieren sauber innerhalb der Toleranz. (Als Nebeneffekt hat der Fix auch Bracket 41-50 spürbar verbessert, ohne dass das explizit beauftragt war — 2 von 7 Veteranen dort bleiben aber weiterhin ungelöst, siehe Abschnitt 25.)

**Übernommen:**
- `public/mosters/dark-forest/dark-forest.31-40.veteran.json` — 7 hochskalierte Veteranen aus 21-30.
- `src/app/classes/adventure/areas/dark-forest.class.ts` — `MONSTER_POOLS['31-40']` bindet jetzt native (7) + Veteranen (7) = **14 Monster** ein.

---

## 21. Bracket 31-40: Baseline-Check — noch drastischer als Bracket 21-30

`scripts/fight-tool-baseline-check-31-40.mjs`: 7 Checkpoint-Referenzcharaktere (Level 31, 150 Punkte, T2-Reste → Level 40, 195 Punkte, volles T4-Gear) gegen alle 14 Bracket-31-40-Monster, 3000 Runs/Paarung.

**Alle 7 nativen Monster waren bei JEDER Checkpoint-Figur bis Level 37 exakt 0,0 % gewinnbar** — nicht nur "sehr schwer", sondern buchstäblich jede einzelne der 3000 Simulationen verloren, für 6 von 7 Checkpoints in Folge. Erst ab Level 39 (T4-Gear, 7 Slots) werden die ersten nativen Monster teilweise gewinnbar (21-100 %), Level 40 (volles T4-Gear) schafft die meisten, aber Knochenkoloss/Grabmalwächter bleiben selbst dort bei 44,5 %/54,9 %.

Das ist ein noch klareres Signal als bei Bracket 21-30 (Abschnitt 12): die nativen Bracket-31-40-Monster wurden ebenfalls nie auf die reale Level-Progression kalibriert, und ihre rohen `attack`-Werte (58-157) sind für die Bracket-Punktespanne (150-195) massiv überdimensioniert.

---

## 22. Kalibrierung der nativen Bracket-31-40-Monster

`scripts/fight-tool-monster-curve-calibration-31-40.mjs`, gleiche Zwei-Hebel-Methode wie Abschnitt 20 (jetzt auch für native Monster nutzbar, nicht nur Veteranen).

| Monster | HP vorher → nachher | Checkpoint | attack vorher → nachher | Winrate danach |
|---|---|---|---|---|
| Untoter Legionär | 420 (unverändert) | Lv31 / 150 Pkt / T2, 0 Slots | 116 → 24 | 75,3 % |
| Geisterklinge | 231 → 116 | Lv32 / 155 Pkt / T2, 1 Slot | 93 → 9 | 58,7 % ⚠️ |
| Verfluchter Magier | 273 (unverändert) | Lv34 / 165 Pkt / T3, 3 Slots | 58 → 39 | 76,6 % |
| Schattenluchs | 357 (unverändert) | Lv35 / 170 Pkt / T3, 4 Slots | 145 → 33 | 75,6 % |
| Knochenkoloss | 966 (unverändert) | Lv37 / 180 Pkt / T4, 5 Slots | 151 → 41 | 74,1 % |
| Grabmalwächter | 1134 → 964 | Lv39 / 190 Pkt / T4, 7 Slots | 157 → 76 | 79,6 % |
| Seelenfresser | 1092 (unverändert) | Lv40 / 195 Pkt / T4, volles Gear | 139 → 116 | 74,9 % |

Gefühlte Schwierigkeit nach Kalibrierung:
- **Level 31 (Bracket-Einstieg):** 77 % → 33 % → 0 % → 0 % → 0 % → 0 % → 0 % — fällt sauber.
- **Level 40 (voll T4 ausgerüstet):** 100 % → 100 % → 100 % → 100 % → 100 % → 100 % → 72 % — der letzte Gegner bleibt bewusst hart.

⚠️ **Wichtige Einschränkung dieser Kalibrierung, ehrlich benannt**: Die Monster-Reihenfolge (welches Monster welchen Checkpoint bekommt) wird normalerweise über die GEMESSENE Winrate der schwächsten Referenzfigur gegen jedes Monster im unkalibrierten Zustand bestimmt (siehe Abschnitt 13, "Ist-Schwierigkeit"). Für Bracket 31-40 lieferte dieser Messschritt **kein Signal** — alle 7 Monster standen unkalibriert bei exakt 0,0 % (Abschnitt 21), die Sortierung fiel deshalb auf die ursprüngliche Array-Reihenfolge zurück statt auf eine echte Schwierigkeits-Messung. Praktische Folge im großen Batch-Test (Abschnitt 23): 5 von 7 nativen Monstern verbessern sich massiv, aber 2 (`Seelenfresser`, `Verfluchter Magier`) zeigen dort einen leichten Rückschritt — plausibel, weil sie einen für ihre tatsächliche Schwierigkeit nicht ganz passenden Checkpoint zugeordnet bekamen. `Geisterklinge` bleibt zudem mit 58,7 % spürbar unter der 78-%-Zielmarke (HP-Hebel lief in die 50-%-Untergrenze, siehe Abschnitt 20). Der Netto-Effekt ist trotzdem klar positiv (Abschnitt 23) — aber diese Kalibrierung ist spürbar unschärfer als die von Bracket 1-10/21-30, wo die Referenzfigur-Messung noch echte Unterschiede zeigte.

---

## 23. Großer Batch-Test Bracket 31-40: 1000 Builds × 10.000 Runs × 6 Kämpfe (Vorher/Nachher)

Identische Methodik wie Abschnitt 14, jetzt Level 31-40 (Punkte 150-195) und gemischtem **T2/T3/T4**-Gear (`TIER_DISTRIBUTION['31-40']`: kein T1/T5 in diesem Bracket) — `scripts/fight-tool-balance-sim-31-40.mjs`.

### Gesamtergebnis

| Metrik | Vorher (aktuell) | Nachher (kalibriert) |
|---|---|---|
| Ø Winrate über alle 1000 Builds | 8,9 % | 13,4 % |
| Ø Tod-Rate | 68,3 % | 47,3 % |
| Ø Timeout-Rate | 22,8 % | 39,3 % |
| Builds mit 0 % Winrate | 809 (80,9 %) | 743 (74,3 %) |
| Builds mit 100 % Winrate | 27 (2,7 %) | 40 (4,0 %) |
| Winrate Level 31-33 | 7,2 % | 13,0 % |
| Winrate Level 34-37 | 9,0 % | 16,3 % |
| Winrate Level 38-40 | 10,3 % | 9,9 % (siehe Einschränkung Abschnitt 22) |

### Pro-Monster (über alle 6×10.000×1000 Einzelkämpfe)

| Monster | Vorher | Nachher | Δ |
|---|---|---|---|
| Seelenfresser (nativ) | 27,3 % | 20,0 % | **−7,3** (Checkpoint-Fehlzuordnung, siehe Abschnitt 22) |
| Blutmoor-Schrecken (Veteran, unverändert) | 26,5 % | 21,7 % | −4,8 (Rausch-Streuung, bleibt bewusst härtester Gegner) |
| Grabmalwächter (nativ) | 28,3 % | 32,8 % | +4,5 |
| Verfluchter Magier (nativ) | 63,5 % | 58,4 % | **−5,1** (Checkpoint-Fehlzuordnung) |
| Orc-Kriegshäuptling (Veteran, unverändert) | 53,0 % | 55,2 % | +2,2 (Rauschen) |
| Knochenkoloss (nativ) | 40,2 % | 68,2 % | **+28,0** |
| Steinriese (Veteran, unverändert) | 66,7 % | 68,8 % | +2,1 (Rauschen) |
| Geisterklinge (nativ) | 50,7 % | 70,0 % | +19,3 |
| Nekromanten-Lehrling (Veteran, unverändert) | 64,5 % | 73,5 % | +9,0 |
| Nachtklingen-Assassine (Veteran, unverändert) | 68,3 % | 76,0 % | +7,7 |
| Untoter Legionär (nativ) | 51,4 % | 77,4 % | **+26,0** |
| Klauenpanther (Veteran, unverändert) | 74,4 % | 77,7 % | +3,3 (Rauschen) |
| Schattenluchs (nativ) | 38,7 % | 78,2 % | **+39,5** |
| Orc-Plünderer (Veteran, unverändert) | 78,6 % | 79,1 % | +0,5 (Rauschen) |

**5 von 7 nativen Monstern verbessern sich massiv** (Schattenluchs +39,5, Untoter Legionär +26,0, Knochenkoloss +28,0, Geisterklinge +19,3, Grabmalwächter +4,5), **2 verschlechtern sich leicht** (Seelenfresser −7,3, Verfluchter Magier −5,1) — exakt das in Abschnitt 22 vorhergesagte Muster der unscharfen Checkpoint-Zuordnung. Insgesamt ein klarer Nettogewinn: Ø Winrate steigt um mehr als die Hälfte relativ (8,9 %→13,4 %), Tod-Rate sinkt deutlich (68,3 %→47,3 %). Die Timeout-Rate steigt (22,8 %→39,3 %) — erwartbar, da schwächerer Monster-Schaden mehr Kämpfe ins 100-Runden-Limit statt in einen Tod laufen lässt, statt eine Verschlechterung zu sein.

---

## 24. Item-/Build-Analyse Bracket 31-40

Gleiches Muster wie Abschnitt 15: **Ausrüstungsgrad korreliert klar mit Winrate** (4-5 belegte Slots: 0-1 % Winrate, volle 9-10 Slots: 17-22 %). Die verfluchte-Item-Auswertung aus Abschnitt 15 ließ sich hier NICHT zuverlässig wiederholen — ab Tier 2 tragen die "verfluchten" Glaskanonen-Varianten pro Slot unterschiedliche Namens-Präfixe statt durchgehend "Splitternd..." (z.B. "Gequälter Kürass", "Dämonen-Klauen"), die einfache Namens-Prüfung aus Abschnitt 15 unterzählt sie deshalb für T2+ (0,00 in beiden Gruppen — offensichtlich kein echter Nullbefund, sondern eine Erkennungslücke). Keine belastbare Aussage dazu für dieses Bracket, nicht weiter verfolgt.

---

## 25. Bekannte Limitationen dieser Testmethodik (Ergänzung Bracket 31-40)

Zusätzlich zu den in Abschnitt 16 genannten Punkten (weiterhin gültig, auch für 31-40):

- **Die Checkpoint-Zuordnung für die nativen 31-40-Monster ist unscharf** (Abschnitt 22) — die Ist-Schwierigkeits-Messung hatte keine Auflösung, weil alle 7 Monster unkalibriert exakt 0,0 % zeigten. Betrifft 2 der 7 Monster (`Seelenfresser`, `Verfluchter Magier`) mit einem leichten Rückschritt im großen Batch-Test.
- **Bracket 41-50 hat weiterhin 2 von 7 nicht konvergierende Veteranen-Monster** (`Untoter Legionär (Veteran)`, `Geisterklinge (Veteran)`) trotz des verbesserten Zwei-Hebel-Kalibrators — und die nativen 41-50-Monster wurden in dieser Session gar nicht erst angefasst. Bracket 41-50 bleibt vollständig offen für eine künftige Session.

---

## 26. Balancing-Empfehlungen Bracket 31-40 (Zusammenfassung)

1. **Empfehlung: die in Abschnitt 22 berechnete Kalibrierung der 7 nativen Bracket-31-40-Monster übernehmen** (`node scripts/fight-tool-monster-curve-calibration-31-40.mjs --apply`). Datenlage: vorher waren alle 7 native Monster bis Level 37 zu 100 % ungewinnbar (Abschnitt 21), nachher ist der Nettoeffekt klar positiv (Abschnitt 23), trotz der in Abschnitt 22 offen benannten Unschärfe bei 2 Monstern. **Noch NICHT in `dark-forest.31-40.json` geschrieben — bitte bestätigen.**
2. Veteranen-Übernahme 31-40 ← 21-30 ist bereits live (Abschnitt 20), keine weitere Aktion nötig.
3. Kein Item-Balancing-Eingriff empfohlen (wie Bracket 21-30) — Ausrüstungsgrad-Korrelation ist gesund und erwartbar, keine verlässlichen Auffälligkeiten bei Items gefunden.

---

## 27. Datei-Änderungen (Bracket-31-40-Arbeit, Teil 4)

| Datei | Änderung |
|---|---|
| `scripts/lib/fight-tool-sim-core.mjs` | Neu: `winRateAgainst`/`calibrateMonsterAttackAndHp` — geteilte Zwei-Hebel-Kalibrierungslogik (Abschnitt 20), von `monster-carry-over.mjs` und den 31-40-Skripten genutzt. |
| `scripts/monster-carry-over.mjs` | Geändert: nutzt jetzt die geteilte Zwei-Hebel-Funktion statt reiner Attack-Kalibrierung (Abschnitt 20). |
| `scripts/fight-tool-baseline-check-31-40.mjs` | Neu: 7 Checkpoint-Referenzcharaktere (Level 31-40) x 14 Monster (Abschnitt 21). |
| `scripts/fight-tool-monster-curve-calibration-31-40.mjs` | Neu: Kalibriert `attack`+`hp` der 7 nativen Bracket-31-40-Monster (Abschnitt 22). `--apply` schreibt in die echte JSON — **bislang nicht ausgeführt**, siehe Abschnitt 26. |
| `scripts/fight-tool-balance-sim-31-40.mjs` | Neu: 1000×10000-Batch, Level 31-40 + T2-4-Gear-Mix + 6-Kämpfe-Abenteuer, `--calibrated`-Flag (Abschnitt 23). |
| `public/mosters/dark-forest/dark-forest.31-40.veteran.json` | Neu (via `scripts/monster-carry-over.mjs`, Abschnitt 20). |
| `public/mosters/dark-forest/dark-forest.31-40.json` | **Unverändert** — die vorgeschlagene Kalibrierung (Abschnitt 22) ist noch nicht angewendet. |
| `src/app/classes/adventure/areas/dark-forest.class.ts` | Geändert: `MONSTER_POOLS['31-40']` bindet native + Veteranen-Monster ein (Abschnitt 20). |
| `scripts/output/fight-tool-baseline-report-31-40.json`, `fight-tool-monster-curve-calibration-31-40.json`, `fight-tool-balance-report-31-40.json`, `fight-tool-balance-report-31-40-calibrated.json` | Neu: Rohdaten aller Testläufe aus Teil 4. |

---

## 29. Nachtrag: Nutzer-Feedback nach dem ersten Bracket-31-40-Batch — Rundenlänge zu hoch

Nach dem ersten Batch-Test (Abschnitt 23) kam vom Nutzer direktes Feedback: (1) Monster in diesem Bereich sollten schon über 800 HP haben (nicht die teils sehr niedrigen Werte, die der HP-Fallback-Hebel aus Abschnitt 20 produziert hatte, z.B. Geisterklinge auf 142 HP runterkalibriert), und (2) Spieler und Monster sollten nicht so viel ausweichen, außer der Spieler hat explizit Glück geskillt — und ein durchschnittlicher Kampf sollte ca. 6-10 Runden dauern.

**Root-Cause-Analyse ergab drei zusammenhängende, aber unterschiedliche Probleme:**

1. **Ausweichen ist über die Brackets hinweg systematisch gestiegen, ohne dass der Spieler mithalten kann.** Glück ist KEIN Schrein-Stat (nur `strength`/`dexterity`/`intelligence`/`vitality` sind investierbar, siehe `DEFAULT_INVESTED_POINTS` in `skills.service.ts`) — Spieler-Glück bleibt praktisch immer beim Basiswert 5, sofern nicht zufällig Gear mit +Glück getragen wird. Monster-Ausweichen ist dagegen bracket-für-bracket gestiegen: Ø 5,7 (1-10) → Ø 7,9 (11-20) → Ø 10,1 (21-30) → Ø 14,3 (31-40, vor dieser Session). Gemessen: bei Ausweichen 19 vs. Glück 5 landet nur noch ~13 % der Spieler-Treffer (Ausweich-Chance des Monsters ~87 %, exakte Formel: `defenseTotal = d20+evasion >= attackTotal = d20+luck`). Das war der Haupttreiber der langen, ziehenden Kämpfe.
2. **Die Checkpoint-Testcharaktere in ALLEN Kalibrierungs-Skripten (auch den bereits für 1-10/11-20/21-30 verwendeten) hatten nie Handschuhe oder eine zweite Waffe (Dual-Wield) ausgerüstet** — `GEAR_SLOT_ORDER` hatte nur 8 statt 10 mögliche Slots. Das drückte die gemessene Spieler-Schadensausbeute an den oberen Checkpoints künstlich (bestätigt: ein "volles Gear"-Level-40-Charakter macht mit Dual-Wield+Handschuhen ~80 % mehr Schaden als das alte Modell zeigte).
3. **Selbst mit beiden Fixes reichte der aktuelle Waffen-/Spell-Schaden in T2-T4 nicht aus**, um 800+-HP-Monster in 6-10 Runden zu besiegen — ein voll ausgerüsteter Level-40-Dual-Wield-Charakter brauchte weiterhin ~20 Runden gegen ein 1400-HP-Monster. Auf Rückfrage (siehe Abschnitt 30) hat der Nutzer eine Anhebung des Waffen-/Spell-Schadens in T2-T4 bestätigt.

---

## 30. Fix: Ausweichen-Kurve, volles Gear-Modell, +90 % Schaden T2-T4

**Fix 1 — Ausweichen-Kurve statt Verhältnis-Skalierung (nur Bracket 31-40, siehe Abschnitt 25 für die Einschränkung):** `scripts/monster-carry-over.mjs` und `scripts/fight-tool-monster-curve-calibration-31-40.mjs` setzen für die 7 Checkpoints jetzt eine feste, niedrige Ausweichen-Kurve `[2, 2, 3, 3, 4, 4, 5]` statt der aus dem Quell-Bracket hochskalierten Werte.

**Fix 2 — HP-Kurve statt Verhältnis-Skalierung/HP-Fallback:** feste, garantiert ≥800 liegende Kurve `[800, 900, 1000, 1100, 1200, 1300, 1400]` für beide Monster-Sets (nativ + Veteranen). Der HP-Fallback-Hebel aus Abschnitt 20 (der bei Bedarf HP absenkt) ist für Bracket 31-40 jetzt deaktiviert (`maxHpReductions: 0`), weil HP fest vorgegeben ist.

**Fix 3 — Checkpoint-Gear-Modell auf 10 Slots erweitert** (`GEAR_SLOT_ORDER` in beiden Skripten): Handschuhe und eine zweite Waffe (Dual-Wield bei 1H-Waffen) ergänzt, `GEAR_SLOT_COUNTS` von `[0,1,3,4,5,7,8]` auf `[0,1,3,5,6,8,10]` angepasst. Betrifft nur Bracket 31-40 heute (die geteilte Funktion in `monster-carry-over.mjs` wird aber bei jedem künftigen Rerun für ALLE Brackets genutzt).

**Fix 4 — Waffen-/Spell-Schaden in T2-T4 um 90 % angehoben** (`scripts/item-damage-buff-t2-t4.mjs`, `--apply` mit Multiplikator 1,9): betrifft `damage-min`/`damage-max`/`magic-damage-min`/`magic-damage-max` aller T2-T4-Waffen UND `effectValues.value` aller reinen Schadens-Spells (`PHYSICAL_DAMAGE`/`ELEMENTAL_DAMAGE`) in `physicalspells`/`firespells`/`coldspells`/`lightningspells`/`chaosspells`, Tier 2-4. Heal-/Energy-Shield-Spells, T1 und T5 bewusst ausgenommen. Beispiele: `Ritterschwert` (T2) 27-39 → 51-74, `Klinge des Champions` (T4) 44-58 → 84-110, Spell `Meteor` (T4) 130 → 247.

⚠️ **Blast-Radius-Hinweis:** Fix 4 ist eine ECHTE, spielweite Item-Änderung — betrifft jeden Charakter mit T2-T4-Ausrüstung, nicht nur Düsterwald-Kämpfe. Nicht getestet: Auswirkung auf andere Gebiete/Encounter (falls es welche mit T2-T4-Ausrüstung außerhalb Düsterwalds gibt) oder PvP-artige Mechaniken (falls vorhanden).

**Ergebnis nach allen 4 Fixes** (Top-Checkpoint, Level 40, volles T4-Dual-Wield, gegen 1400-HP-Monster): Ø Runden 35,0 (nur HP/Ausweichen-Fix) → 20,1 (+ Gear-Modell-Fix) → 10,6-13,9 (+ Schadens-Fix, je nach Multiplikator-Stufe getestet). Mittlerer Checkpoint (Level 37, T3/T4-Mix) landet bei ~15-21 Runden statt vorher 20-90 — deutlich näher am Ziel, aber nicht überall exakt 6-10 (siehe Abschnitt 31 für die finalen Zahlen und warum das am unteren Bracket-Ende kaum vermeidbar ist).

---

## 31. Nachjustierung: 2 Ausreißer-Monster nach dem Schadens-Fix gekappt

Der Schadens-Fix (Abschnitt 30) hatte einen Nebeneffekt: weil die Checkpoint-Kalibrierung `attack` so anpasst, dass die (jetzt viel stärkere) Checkpoint-Figur eine Ziel-Winrate von ~78 % erreicht, schoss der `attack`-Wert der beiden HÄRTESTEN Checkpoints (die einzigen mit Dual-Wield, siehe `GEAR_SLOT_COUNTS`-Sprung von 8 auf 10 Slots) deutlich über die restliche Kurve hinaus:

| Monster | attack nach Kalibrierung | Restliche Kurve |
|---|---|---|
| Grabmalwächter (nativ) | 191 | 28, 32, 48, 46, 73, **191**, 283 |
| Seelenfresser (nativ) | 283 | (s.o.) |
| Orc-Kriegshäuptling (Veteran) | 172 | 27, 46, 36, 68, 72, **172**, 213 |
| Blutmoor-Schrecken (Veteran) | 213 | (s.o.) |

Im großen Batch-Test (zufällige Level/Gear-Kombinationen, nicht nur der exakte Ziel-Checkpoint) machte das diese 4 Monster zu Ausreißern, die selbst gut ausgerüstete, aber nicht exakt maximal-gekleidete Charaktere in wenigen Runden töteten (Ø Winrate über alle Builds fiel dadurch sogar unter den Zwischenstand aus Abschnitt 23 zurück, auf 10,6 %). Manuell auf einen Wert nahe der Fortsetzung der übrigen Kurve gekappt: `Grabmalwächter` 191→95, `Seelenfresser` 283→120, `Orc-Kriegshäuptling (Veteran)` 172→95, `Blutmoor-Schrecken (Veteran)` 213→120. Direkte Bearbeitung der JSON-Dateien, kein Skript-Rerun (die automatische Kalibrierung würde ohne eine feinere Zwischenstufen-Logik denselben Sprung wieder produzieren — als bekannte Einschränkung in Abschnitt 25 vermerkt).

---

## 32. Finaler Batch-Test Bracket 31-40 (nach allen Fixes + Ausreißer-Korrektur)

`node scripts/fight-tool-balance-sim-31-40.mjs 1000 10000` gegen den vollständig überarbeiteten Pool (Ausweichen-Kurve, HP-Kurve ≥800, +90 % T2-T4-Schaden, gekappte Ausreißer):

| Metrik | Original (vor der ganzen Session) | Zwischenstand (nur Monster-Kalibrierung, Abschnitt 23) | **Final** |
|---|---|---|---|
| Ø Winrate | 8,9 % | 13,4 % | **14,4 %** |
| Ø Tod-Rate | 68,3 % | 47,3 % | 69,6 % |
| Ø Timeout-Rate | 22,8 % | 39,3 % | 16,0 % |
| Builds mit 0 % Winrate | 809 (80,9 %) | 743 (74,3 %) | 700 (70,0 %) |
| Builds mit 100 % Winrate | 27 (2,7 %) | 40 (4,0 %) | 34 (3,4 %) |

Die Tod-Rate liegt wieder in etwa auf dem Ausgangsniveau (69,6 % vs. 68,3 %) — nicht, weil nichts erreicht wurde, sondern weil die HP-Kurve jetzt bei ALLEN 14 Monstern mindestens 800 liegt (vorher: teils nur 154-357 HP bei den leichteren Monstern), also praktisch jeder zufällige Kampf gegen ein "hartes" 800+-HP-Ziel geht statt manchmal gegen ein leichtes 150-HP-Ziel. Das ist eine bewusste Verschiebung (auf Nutzerwunsch), keine Verschlechterung der Kalibrierung selbst.

**Pro-Monster (finaler Stand):**

| Monster | Winrate | Ø Runden |
|---|---|---|
| Seelenfresser (nativ) | 27,6 % | 11,1 |
| Grabmalwächter (nativ) | 31,0 % | 14,7 |
| Blutmoor-Schrecken (Veteran) | 39,3 % | 18,7 |
| Orc-Kriegshäuptling (Veteran) | 45,2 % | 19,1 |
| Verfluchter Magier (nativ) | 48,0 % | 12,4 |
| Nekromanten-Lehrling (Veteran) | 61,5 % | 17,9 |
| Steinriese (Veteran) | 71,3 % | 33,8 |
| Klauenpanther (Veteran) | 76,5 % | 25,3 |
| Knochenkoloss (nativ) | 77,2 % | 30,0 |
| Geisterklinge (nativ) | 85,6 % | 31,1 |
| Nachtklingen-Assassine (Veteran) | 87,6 % | 26,4 |
| Schattenluchs (nativ) | 87,7 % | 30,6 |
| Orc-Plünderer (Veteran) | 88,1 % | 27,8 |
| Untoter Legionär (nativ) | 91,4 % | 25,8 |

**Ehrliche Einordnung des Rundenziels**: die 6-10-Runden-Vorgabe wird für GUT ausgerüstete, level-passende Charaktere jetzt oft erreicht (Top-Builds im Batch: 4,8 / 6,9 / 8,2 / 9,2 / 9,8 / 10,1 / 11,6 / 11,7 / 12,0 Runden) — aber nicht durchgehend über den GESAMTEN Zufalls-Pool (Ø über alle Einzelkämpfe liegt bei 11-34 Runden). Das liegt am selben strukturellen Grund wie Abschnitt 14/23: die Pro-Monster-Zahlen mischen frische Level-31-Charaktere mit 0 Gear (die realistisch LANGE brauchen, HP≥800 hin oder her) mit voll ausgerüsteten Level-40-Charakteren (die tatsächlich 6-10 Runden schaffen). Ein hartes 6-10-Runden-Ziel für JEDE denkbare Level/Gear-Kombination ist mit einer festen HP≥800-Vorgabe nicht erreichbar, ohne entweder Frühbracket-Charaktere unrealistisch stark zu machen oder das Rundenziel nur für "angemessen ausgerüstete" Charaktere zu verstehen (wofür es jetzt gut funktioniert).

---

## 33. Aktualisierte Balancing-Empfehlungen & Datei-Änderungen (ersetzt Abschnitt 26/27)

**Status: alles in diesem Abschnitt ist bereits angewendet** (im Gegensatz zu Abschnitt 17, wo die Bracket-21-30-Kalibrierung noch auf Bestätigung wartete — hier wurde die Anwendung bereits im Gespräch bestätigt und umgesetzt).

1. ✅ Ausweichen-Kurve, HP-Kurve, 10-Slot-Gear-Modell für Bracket 31-40 (nativ + Veteranen) — live.
2. ✅ +90 % Waffen-/Spell-Schaden Tier 2-4 — live, spielweit (nicht nur Düsterwald).
3. ✅ 4 Ausreißer-Monster (Grabmalwächter, Seelenfresser, Orc-Kriegshäuptling (Veteran), Blutmoor-Schrecken (Veteran)) manuell auf die Kurve gekappt — live.
4. **Empfehlung für eine künftige Session**: dieselbe Ausweichen-Analyse (Abschnitt 29, Punkt 1) gilt strukturell auch für Bracket 1-10/11-20/21-30 — dort ist Ausweichen "nur" auf Ø 5,7-10,1 statt Ø 14,3 gestiegen, also weniger extrem, aber derselbe Mechanismus (Spieler-Glück bleibt bei 5, Monster-Ausweichen wächst mit) wirkt dort genauso. Nicht rückwirkend angefasst, um bereits bestätigte Werte nicht ungefragt zu verändern — aber wert, beim nächsten Bracket (41-50) oder einer dedizierten Ausweichen-Passe zu berücksichtigen.
5. **Empfehlung**: die Checkpoint-Kalibrierungs-Skripte für 1-10/11-20/21-30 nutzen weiterhin das alte 8-Slot-Gear-Modell (ohne Handschuhe/Dual-Wield) — falls diese Brackets je neu kalibriert werden, sollte das 10-Slot-Modell aus `monster-carry-over.mjs` übernommen werden.

**Zusätzliche Datei-Änderungen dieser Session (Teil 5, ergänzt Abschnitt 27):**

| Datei | Änderung |
|---|---|
| `scripts/monster-carry-over.mjs` | Geändert: 10-Slot-Gear-Modell, feste HP-/Ausweichen-Kurve nur für Bracket 31-40 (`config.hpCurve`/`config.evasionCurve`), Rundenzahl-Logging (Abschnitt 30). |
| `scripts/fight-tool-monster-curve-calibration-31-40.mjs` | Geändert: dieselben Fixes für die nativen Monster, `maxHpReductions: 0` (HP ist jetzt fest). |
| `scripts/item-damage-buff-t2-t4.mjs` | Neu: hebt Waffen-/Spell-Schaden Tier 2-4 um einen konfigurierbaren Faktor an (Default 1,9×). `--apply` schreibt in die echten Item-JSONs — **ausgeführt**. |
| `public/item-data/weapons/weapon_tier{2,3,4}.json` | **Geändert**: `damage-min`/`damage-max`/`magic-damage-min`/`magic-damage-max` ×1,9. |
| `public/item-data/skills/physical/physicalspells_tier{2,3,4}.json`, `.../magic/{fire,cold,lightning,chaos}/..._tier{2,3,4}.json` | **Geändert**: `effectValues.value` reiner Schadens-Spells ×1,9. |
| `public/mosters/dark-forest/dark-forest.31-40.json` | **Geändert** (erneut): HP-Kurve ≥800, Ausweichen-Kurve, `attack` neu kalibriert gegen die verstärkten Checkpoint-Charaktere, 2 Ausreißer manuell gekappt. |
| `public/mosters/dark-forest/dark-forest.31-40.veteran.json` | **Geändert** (erneut): dieselben Fixes, 2 Ausreißer manuell gekappt. |

---

## 34. Wie man das selbst nachvollzieht/wiederholt

```bash
# ── Bracket 1-10 ─────────────────────────────────────────────────────────
# Voller Batch: 1000 zufällige T1-Builds x 10000 Runs (Standard)
node scripts/fight-tool-balance-sim.mjs
node scripts/fight-tool-balance-sim.mjs 200 5000   # kleinere/schnellere Stichprobe

# Referenz-Charaktere (blutiger Anfänger / halb / voll T1) vs alle 7 Bracket-1-10-Monster
node scripts/fight-tool-baseline-check.mjs
node scripts/fight-tool-baseline-check.mjs 10000   # mehr Runs pro Paarung

# Kalibrierungs-Modus (NICHT persistiert, nur zum Austesten von Zielwerten):
ATTACK_MULT=1.5 LUCK_MULT=1.2 node scripts/fight-tool-baseline-check.mjs

# Monster-Kurve neu kalibrieren (Trockenlauf, zeigt nur die Zahlen):
node scripts/fight-tool-monster-curve-calibration.mjs
# ... und tatsächlich in die JSON schreiben:
node scripts/fight-tool-monster-curve-calibration.mjs --apply

# Veteran-Monster (hochskalierte Vorgänger-Bracket-Monster) neu generieren —
# schreibt IMMER die *.veteran.json-Dateien (auch ohne --apply) für ALLE
# Brackets (11-20/21-30/31-40/41-50), nur zur Kontrolle vor dem manuellen
# Verbinden in dark-forest.class.ts (nur 11-20 und 21-30 sind aktuell brauchbar):
node scripts/monster-carry-over.mjs

# ── Bracket 21-30 (neu, Teil 3) ──────────────────────────────────────────
# Referenz-Charaktere (Level 21-30) vs alle 14 Bracket-21-30-Monster (Abschnitt 12)
node scripts/fight-tool-baseline-check-21-30.mjs
node scripts/fight-tool-baseline-check-21-30.mjs 5000   # mehr Runs pro Paarung

# Native-Monster-Kurve kalibrieren (Trockenlauf, Abschnitt 13):
node scripts/fight-tool-monster-curve-calibration-21-30.mjs
# ... und tatsächlich in dark-forest.21-30.json schreiben (noch nicht ausgeführt):
node scripts/fight-tool-monster-curve-calibration-21-30.mjs --apply

# Großer Batch (Abschnitt 14) — Standard 1000 Builds x 10000 Runs x 6 Kämpfe:
node scripts/fight-tool-balance-sim-21-30.mjs
node scripts/fight-tool-balance-sim-21-30.mjs 100 2000          # kleinere Stichprobe
node scripts/fight-tool-balance-sim-21-30.mjs 1000 10000 --calibrated  # gegen die vorgeschlagenen Werte

# ── Bracket 31-40 (neu, Teil 4) ──────────────────────────────────────────
# Veteranen-Übernahme (alle Brackets, inkl. verbessertem HP+attack-Kalibrator):
node scripts/monster-carry-over.mjs

# Referenz-Charaktere (Level 31-40) vs alle 14 Bracket-31-40-Monster (Abschnitt 21)
node scripts/fight-tool-baseline-check-31-40.mjs
node scripts/fight-tool-baseline-check-31-40.mjs 5000

# Native-Monster-Kurve kalibrieren (Trockenlauf, Abschnitt 22):
node scripts/fight-tool-monster-curve-calibration-31-40.mjs
# ... und tatsächlich in dark-forest.31-40.json schreiben (noch nicht ausgeführt):
node scripts/fight-tool-monster-curve-calibration-31-40.mjs --apply

# Großer Batch (Zwischenstand-Herleitung, Abschnitt 23):
node scripts/fight-tool-balance-sim-31-40.mjs
node scripts/fight-tool-balance-sim-31-40.mjs 1000 10000 --calibrated

# ── Bracket 31-40 Nachtrag (Teil 5, finaler Stand — Abschnitt 29-33) ─────
# Waffen-/Spell-Schaden T2-T4 anheben (Trockenlauf zeigt nur die Zahlen):
node scripts/item-damage-buff-t2-t4.mjs
node scripts/item-damage-buff-t2-t4.mjs --apply 1.9   # tatsächlich übernehmen (Multiplikator optional, Default 1.9)

# Danach Veteranen- und Native-Kalibrierung erneut laufen lassen (jetzt mit
# fester HP-/Ausweichen-Kurve + 10-Slot-Gear-Modell, siehe Abschnitt 30):
node scripts/monster-carry-over.mjs
node scripts/fight-tool-monster-curve-calibration-31-40.mjs --apply

# Finalen Batch verifizieren:
node scripts/fight-tool-balance-sim-31-40.mjs 1000 10000
```

Rohdaten (alle Build-Ergebnisse im Detail) liegen unter `scripts/output/fight-tool-balance-report.json`, `scripts/output/fight-tool-baseline-report.json`, `scripts/output/fight-tool-monster-curve-calibration.json` (Bracket 1-10) sowie `scripts/output/fight-tool-baseline-report-21-30.json`, `scripts/output/fight-tool-monster-curve-calibration-21-30.json`, `scripts/output/fight-tool-balance-report-21-30.json`, `scripts/output/fight-tool-balance-report-21-30-calibrated.json` (Bracket 21-30, Teil 3) sowie `scripts/output/fight-tool-baseline-report-31-40.json`, `scripts/output/fight-tool-monster-curve-calibration-31-40.json`, `scripts/output/fight-tool-balance-report-31-40.json` (finaler Stand, überschreibt den Zwischenstand bei jedem erneuten Lauf) (Bracket 31-40, Teil 4+5).

⚠️ Die beiden manuell gekappten Ausreißer-Paare (Grabmalwächter/Seelenfresser, Orc-Kriegshäuptling (Veteran)/Blutmoor-Schrecken (Veteran), siehe Abschnitt 31) werden von KEINEM der obigen Skripte automatisch reproduziert — ein erneuter Lauf von `monster-carry-over.mjs`/`fight-tool-monster-curve-calibration-31-40.mjs --apply` nach dem Schadens-Fix würde denselben Attack-Sprung an den obersten 2 Checkpoints wieder erzeugen und müsste danach erneut manuell nachjustiert werden.

⚠️ **Wartungshinweis**: `fight-simulator.util.ts` und `scripts/lib/fight-tool-sim-core.mjs` sind zwei getrennte Ports derselben Kampf-Formeln (TS im Browser, JS in Node — dieses Projekt hat kein ts-node/tsx). Wenn sich künftig etwas an `FightService`/`SpellsEngineService`/`SkillsService` ändert, müssen beide Dateien manuell nachgezogen werden, sonst driftet die Analyse wieder von der echten Kampf-Logik ab.
