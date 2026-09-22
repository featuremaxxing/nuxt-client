# Projekt-Hinweise für Claude

Wiederkehrende Fallstricke in diesem Repo, die sonst bei jeder Feature-Arbeit neu entdeckt werden.

## Tests: jsdom-Lücken beim Mocken von Canvas/Pointer/Viewport

jsdom bildet mehrere Browser-APIs nicht oder nur unvollständig nach. Betroffene Komponenten
(Canvas-Zeichnen, PointerEvents, IntersectionObserver, requestAnimationFrame) brauchen manuelle
Stubs in `beforeEach`:

- `HTMLCanvasElement.prototype.getContext` liefert standardmäßig `null` → mocken
  (`vi.spyOn(...).mockReturnValue({...} as unknown as CanvasRenderingContext2D)`).
- `setPointerCapture` existiert gar nicht → `HTMLCanvasElement.prototype.setPointerCapture = vi.fn()`,
  falls noch nicht vorhanden.
- `getBoundingClientRect()` liefert nur Nullen → mocken mit fester Breite/Höhe, sonst werden
  Klick-Positionen zu `NaN`.
- `clientX`/`clientY` sind auf einem echten `PointerEvent` nur-Getter → `.trigger("pointerdown", {clientX...})`
  von `@vue/test-utils` wirft. Stattdessen echtes `new PointerEvent(type, {bubbles, cancelable, ...init})`
  direkt per `target.dispatchEvent(...)` verschicken.
- `IntersectionObserver` fehlt komplett → **echte Klasse** stubben (nicht `vi.fn().mockImplementation(...)`
  als Konstruktor — das triggert eine Vitest-Warnung und die Observer feuern nie), die im
  Konstruktor den Callback speichert und ihn in `observe()` sofort mit `isIntersecting: true` aufruft.
- `requestAnimationFrame` ist echtzeit-basiert → für synchrones `await flushPromises()` auf
  `cb(0); return 0;` umstubben.

## `eslint --fix` zerstört BOM-Escape-Sequenzen

In CSV-Export-Code kommt `﻿` als Escape-Sequenz vor. `eslint --fix` hat das in der
Vergangenheit mehrfach in ein echtes BOM-Byte umgeschrieben. Nach jedem Lint-Lauf an
betroffenen Dateien mit `grep -n uFEFF <datei>` prüfen, dass es noch die Escape-Sequenz ist.

## Locales: immer alle vier Sprachen pflegen

Neue UI-Texte brauchen Keys in **allen vier** `src/locales/{de,en,es,uk}.ts` — nicht nur `de`/`en`.

## Icons: `@icons/material` ist eine Allowlist, kein Re-Export

`src/components/icons/material/index.ts` exportiert nur explizit gelistete `mdi*`-Icons
(alphabetisch sortiert, Import- und Export-Liste getrennt). Ein neues Icon aus `@mdi/js` muss in
beiden Listen ergänzt werden, sonst TS2305 "no exported member".

## Root-Cause bei Auswahl-/Navigations-Bugs: nullbare Keys

Wiederkehrendes Bug-Muster: Vue-reaktive Auswahl/State wird an ein Feld gekoppelt, das `null`
oder über mehrere Zeilen hinweg identisch sein kann (z. B. `submission.id` bei fehlender Abgabe),
statt an ein immer eindeutiges Feld (z. B. `userId`). Bei Navigations-/Auswahl-Bugs zuerst prüfen,
ob der Selektor-Key wirklich eindeutig ist.

## `npm install`: Engine-Version passt nicht

Deklariert sind `engines: {node:"24", npm:"11"}`; die lokale Umgebung hat oft ältere Versionen.
`EBADENGINE`-Warnungen sind unkritisch — mit `--no-engine-strict` installieren, blockiert sonst
nichts.

## Staging-Deploy: ein Slot pro Repo-Paar

`staging.kibox.online` fährt genau eine Branch-Kombination gleichzeitig, gesteuert über das
`staging`-Label auf je einem PR in `featuremaxxing/nuxt-client` und `featuremaxxing/schulcloud-server`.
Label umsetzen = altes PR-Paar verliert es, neues bekommt es:

```
gh pr edit <alte-nr> --repo featuremaxxing/<repo> --remove-label staging
gh pr edit <neue-nr> --repo featuremaxxing/<repo> --add-label staging
```

Beim Umschalten wird die Staging-DB frisch von Live kopiert — vorherige Testdaten sind danach weg,
das vorherige Feature ist auf Staging nicht mehr erreichbar (aber jederzeit durch Zurückschalten
reversibel). Feature-Flags leben in `nbc-teststack/compose.yml` (`x-server-env`) — vor dem
Umschalten prüfen, ob das nötige Flag dort schon auf `main` aktiv ist, bevor ein eigener Flag-PR
angelegt wird.
