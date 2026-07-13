# Fight-Tool Balance-Report: T1-Gear + 30 Attributpunkte vs. Düsterwald Bracket 1-10

**Datum:** 2026-07-14
**Auftrag:** 1000 zufällige Builds mit ausschließlich Tier-1-Ausrüstung generieren, je mit 30 Schrein-Attributpunkten, gegen zufällige Step-Sequenzen aus Düsterwald-Monstern testen (je 10.000 Durchläufe pro Build), und beurteilen, wie balanced das Ganze ist.

## TL;DR

- **Ich habe dabei einen echten Bug im Kampf-Code gefunden, der Tode praktisch unmöglich gemacht hat** — nicht nur in meinen Analyse-Skripten, sondern auch im echten `/fight-tool`. Behoben.
- **Nach dem Fix sieht die Balance bereits gesund aus**: Ø Winrate 88,6 % über 1000 zufällige T1-Builds, Ø Tod-Rate 11,3 %, eine sinnvolle Schwierigkeitskurve innerhalb des Brackets (leichte Monster fast immer gewinnbar, schwerste Monster echte Herausforderung).
- **Ich habe deshalb bewusst KEINE Monster- oder Item-Stats verändert.** Die "Änderung", die tatsächlich nötig war, war der Bugfix selbst — nicht ein Balance-Tuning. Begründung unten.

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

## 5. Fazit & Entscheidung: keine Monster-/Item-Änderungen

Basierend auf den Zahlen nach dem Bugfix:

- 83,1 % aller 1000 zufälligen T1-Builds gewinnen mehr als 80 % ihrer Läufe.
- Die durchschnittliche Tod-Rate (11,3 %) ist ein gesundes, spürbares aber nicht erdrückendes Risiko.
- Die Schwierigkeitskurve *innerhalb* des Brackets (leicht → schwer) ist sinnvoll gestaffelt.
- Die schwächsten Ausreißer erklären sich vollständig durch die absichtliche Glaskanonen-Mechanik, nicht durch zu starke Monster.

**Ich habe deshalb keine Monster-Stats (`public/mosters/dark-forest/dark-forest.1-10.json`) oder Item-Stats verändert.** Vor dem Bugfix sah es so aus, als bräuchte das Bracket einen deutlichen Monster-Buff (ich hatte testweise sogar mit +75-300 % Angriff/Glück kalibriert — selbst DAS reichte nicht gegen den Bug, ein klares Zeichen, dass das Problem nie in den Monster-Werten lag). Nach dem Fix ist genau dieser künstliche Buff nicht mehr nötig — die vorhandenen Werte ergeben bereits eine stimmige Kurve.

Falls du trotzdem eine andere Ziel-Schwierigkeit im Kopf hast (z.B. "der blutige Anfänger soll gegen die 2 stärksten Monster nicht nur 5-7 %, sondern 20-30 % Winrate haben"), sag mir die Zielzahl — dann kalibriere ich gezielt mit dem `ATTACK_MULT`/`LUCK_MULT`-Mechanismus (siehe unten) und setze das dann tatsächlich in der JSON um.

---

## 6. Was sich am Code geändert hat

| Datei | Änderung |
|---|---|
| `src/app/utils/fight-simulator.util.ts` | **Bugfix**: Todes-Check vor Regeneration (siehe Abschnitt 1). Betrifft das echte `/fight-tool`. |
| `scripts/lib/fight-tool-sim-core.mjs` | Neu: gemeinsame, Angular-freie Stat-/Kampf-Logik für alle Balance-Skripte (derselbe Fix). |
| `scripts/fight-tool-balance-sim.mjs` | Neu: generiert N zufällige T1-Builds, simuliert je M Runs gegen zufällige Bracket-1-10-Step-Sequenzen, aggregiert Winrate-Verteilung. |
| `scripts/fight-tool-baseline-check.mjs` | Neu: 3 feste Referenz-Charaktere einzeln gegen jedes der 7 Bracket-1-10-Monster (die Schwierigkeitskurve aus Abschnitt 3). |
| `public/mosters/dark-forest/dark-forest.1-10.json` | **Unverändert** — bewusste Entscheidung, siehe Abschnitt 5. |
| Alle Item-JSONs | **Unverändert**. |

## 7. Wie man das selbst nachvollzieht/wiederholt

```bash
# Voller Batch: 1000 zufällige T1-Builds x 10000 Runs (Standard)
node scripts/fight-tool-balance-sim.mjs
node scripts/fight-tool-balance-sim.mjs 200 5000   # kleinere/schnellere Stichprobe

# Referenz-Charaktere (blutiger Anfänger / halb / voll T1) vs alle 7 Bracket-1-10-Monster
node scripts/fight-tool-baseline-check.mjs
node scripts/fight-tool-baseline-check.mjs 10000   # mehr Runs pro Paarung

# Kalibrierungs-Modus (NICHT persistiert, nur zum Austesten von Zielwerten):
ATTACK_MULT=1.5 LUCK_MULT=1.2 node scripts/fight-tool-baseline-check.mjs
```

Rohdaten (alle 1000 Build-Ergebnisse im Detail) liegen unter `scripts/output/fight-tool-balance-report.json` und `scripts/output/fight-tool-baseline-report.json`.

⚠️ **Wartungshinweis**: `fight-simulator.util.ts` und `scripts/lib/fight-tool-sim-core.mjs` sind zwei getrennte Ports derselben Kampf-Formeln (TS im Browser, JS in Node — dieses Projekt hat kein ts-node/tsx). Wenn sich künftig etwas an `FightService`/`SpellsEngineService`/`SkillsService` ändert, müssen beide Dateien manuell nachgezogen werden, sonst driftet die Analyse wieder von der echten Kampf-Logik ab.
