# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primär Schüler:innen der Sekundarstufe I/II und Lehrkräfte an Schulen, sekundär Schul-Admins.
Schüler:innen nutzen die Plattform täglich für Boards, Aufgaben und Dateien, oft mobil.
Lehrkräfte bereiten Unterricht vor, legen Räume/Boards an, verteilen Aufgaben und sehen
Lernstände ein. Admins verwalten Nutzer:innen, Klassen und Schuleinstellungen.
*(aus Repo-Kontext und vorheriger Nutzerentscheidung übernommen, nicht einzeln bestätigt)*

## Product Purpose

„Lernraum“ (Fork der dBildungscloud/Schul-Cloud) ist die digitale Lernumgebung einer Schule:
Räume mit Boards (Spalten/Karten mit Inhaltselementen wie Text, Dateien, Aufgaben, H5P, Umfragen),
Aufgabenverwaltung, Dateiablage, Kalender, Nachrichten/News und Nutzerverwaltung. Erfolg heißt:
Schüler:innen finden ohne Reibung, was zu tun ist und wie weit sie sind; Lehrkräfte erstellen und
überblicken Unterricht mit wenigen Klicks.
*(aus README.md und Codebasis abgeleitet)*

## Positioning

Deutscher/europäischer Schulträger-Betrieb (Bundesländer), DSGVO-konform, kein Vendor-Lock-in zu
US-Hyperscalern; kombiniert Board/Aufgaben/Datei/Kommunikation in einer Oberfläche statt
Einzeltools. *(aus Projektkontext (Bundesland-Themes, Fork-Modell) abgeleitet, nicht mit Nutzer
final bestätigt — bei Bedarf später schärfen)*

## Operating Context

- Mehrmandantenfähig über Bundesland-Themes (`brb`, `n21`, `thr`, `default`), gebaut per
  `SC_THEME`-Build-Arg; die aktuelle Instanz läuft mit `n21`.
- Zwei Frontends aktiv nebeneinander: `nuxt-client` (Vue 3/Vuetify, neue Bereiche: Dashboard,
  Räume, Boards, Aufgaben, Teile der Verwaltung) und `schulcloud-client` (Legacy Express/Handlebars/
  Bootstrap 4, weiterhin führend für Login, Erst-Login, Dateien, Kalender, Teams, Kurs-Themen,
  Hausaufgaben-Details, Konto, Hilfe). Ein Reverse Proxy (Caddy) routet pfadbasiert zwischen beiden.
- Rollout-Workflow: Feature-Branches → PR mit `staging`-Label → `staging.kibox.online` → Merge nach
  `main` → automatisches Deploy auf `kibox.online` (siehe `nbc-teststack/FEATURE-WORKFLOW.md`).
- Genutzt im Schulalltag, auf Schul- und Privatgeräten (Desktop im Klassenzimmer/Lehrerzimmer,
  Smartphone/Tablet bei Schüler:innen), teils über Beamer/Whiteboard im Unterricht.

## Capabilities and Constraints

- Vier UI-Sprachen: de, en, es, uk (`src/locales/*.ts`). Jede neue/geänderte Textstelle braucht
  Keys in allen vieren.
- DSGVO: keine Drittanbieter-CDNs/Tracking für Schriften, Icons oder Skripte; alles selbst gehostet.
- Vuetify 3 bleibt die Komponenten-Engine im Vue-Client (Migrationsrisiko für ~100–130 an Vuetify
  gekoppelte Unit-Tests bei Primitive-Austausch); Bootstrap 4 bleibt im Legacy-Client.
- Kein Dark Theme aktuell vorhanden.
- Undurchsichtig/offen: genaue Marktabgrenzung gegen Moodle/Teams/Itslearning, formale
  Markenrichtlinien — bislang nicht dokumentiert, wird bei Bedarf nachgezogen statt jetzt erfragt.

## Brand Commitments

Produktname und Bundesland-Branding (Logos, Favicons je Theme unter `public/themes/<theme>/`)
bleiben bestehen. Ton/Optik stehen für den Neuentwurf offen. *(angenommen, nicht einzeln
bestätigt)*

## Evidence on Hand

- Bestehender Code als einzige verlässliche Quelle für Funktionsumfang (siehe DESIGN.md für den
  Ist-Zustand der Optik).
- Keine Nutzerforschung, Kennzahlen oder Testimonials im Repo vorhanden — im Neuentwurf nichts
  davon erfinden.

## Product Principles

1. Orientierung vor Dekoration: Wo bin ich, was ist zu tun, was kommt als Nächstes — auf jeder Seite.
2. Eine primäre Handlung pro Ansicht, alles Sekundäre hinter Progressive Disclosure.
3. Fortschritt und Status sind durchgängig sichtbar und nie ausschließlich farbcodiert.
4. Mobile-Kernflows für Schüler:innen sind gleichwertig zu Desktop, nicht nachrangig.
5. Barrierefreiheit (WCAG 2.2 AA / BITV 2.0) ist Abnahmekriterium, kein Nice-to-have.

## Accessibility & Inclusion

Ziel: WCAG 2.2 AA / BITV 2.0. Nutzung durch Schüler:innen mit unterschiedlichem Leseniveau und
teils Lese-/Rechtschreibschwäche; Lehrkräfte nutzen teils Beamer/Whiteboard mit Abstand zum
Bildschirm. Status nie allein über Farbe, Touch-Ziele ≥44px, `prefers-reduced-motion` respektieren.
