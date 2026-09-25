---
version: 1
slug: "src-pages-dashboard-page-vue"
primary_target: "src/pages/Dashboard.page.vue"
related_targets: ["src/modules/ui/layout/sidebar/Sidebar.vue","src/modules/page/room/Rooms.page.vue","src/modules/feature/board/board/Board.vue"]
---

# Surface brief: Lernraum App (Dashboard als Leitfläche, Shell, Räume, Board)

Mode: Operate. Audience: Schüler:innen Sek I/II (oft mobil) und Lehrkräfte (Desktop, Beamer). Job: sofort sehen, was fällig ist, wie weit man ist, und mit einer Handlung weitermachen. Constraints: Vuetify 3 bleibt Engine, vier Locales, WCAG 2.2 AA, hell + dunkel, Bundesland-Logo bleibt.

## Direction contract

THESIS: Die App ist das Lernposter aus dem Chemieraum. Aufgaben und Räume sind Elemente in einem Kachelraster mit Legende; man liest Stand und Frist wie ein Element: Kürzel, Ordnungszahl, Kategoriefarbe. Verweigert wird das Kategorie-Standardbild aus weißen SaaS-Karten mit Schatten, grauem Rauschen und einem Blau.

OWN-WORLD: Kühler Tafelgrund (hell #F3F5F7 / dunkel #0E1117), Kacheln als flache Flächen mit 1px-Linie und 6px-Radius, keine Schatten in Ruhe. Tinte #141A22, Primär Tafelblau. Kategoriefarben (Koralle, Senf, Petrol, Himmel, Violett u. a.) nur als Kachelfarbfelder und Legenden-Swatches. Status als Form: Kontur = offen, schraffiert = abgegeben, gefüllt = bewertet; überfällig zusätzlich Koralle + Icon. Ein Senf-Band markiert "heute". Archivo (breit, fett) für Kürzel, Zahlen und Überschriften mit Tabellenziffern; Atkinson Hyperlegible Next für Fließtext, Basis 17px.

STORY: Wer die App öffnet, versteht in einer Sekunde, was heute fällig ist und was schon geschafft ist; die Legende erklärt jede Farbe und Form; ein Klick auf eine Kachel führt zur Aufgabe.

FIRST VIEWPORT: Seitenkopf mit Titel "Übersicht" und Datum. Darunter die Legenden-Leiste (Stati als Form-Swatches) mit Zählern. Dann das Heute-Band in Senf über volle Breite mit den heute fälligen Aufgaben als große Element-Kacheln: oben links Fachkürzel monumental (z. B. "Ma"), oben rechts die Frist als Ordnungszahl (Tag), unten Aufgabenname und Kursname. Rechts daneben bzw. darunter "Diese Woche" als kleineres Raster. Navigation links als schmale Gruppen-Leiste mit Icon + Label.

FORM: Das Lernposter (Periodensystem-Wandtafel), Position 7 der geerdeten Liste, Seed-Key 7684fa3f. Raises: Form statt Farbe für Status (Tanznotation), Heute-Band (Tiefenprofil), monumentale Kürzel (Buchstabensturm), feste Stationen offen/abgegeben/bewertet (Dunkelkammer), Tabellenziffern (Datamatics).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction
Kachel-Hover/Fokus: Die Linie wird zur 2px-Tintenkante, die Kachel hebt sich nicht; die Legende hebt beim Hover über einen Status alle passenden Kacheln hervor (andere dimmen). Motion: einmalige, kurze Ease-out-Einblendung der Kacheln beim Laden, unter reduced-motion aus.
