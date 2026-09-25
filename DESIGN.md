---
name: Lernraum
description: The school's learning space, read like the wall chart in the chemistry room.
colors:
  chalk-ground: "#F3F5F7"
  paper-surface: "#FFFFFF"
  slate-wash: "#EBEEF2"
  ink: "#141A22"
  ink-muted: "#4F5A67"
  line: "rgba(20, 26, 34, 0.14)"
  line-strong: "rgba(20, 26, 34, 0.32)"
  tafelblau: "#1F3F8F"
  tafelblau-deep: "#17306E"
  tafelblau-deepest: "#112552"
  tafelblau-tint: "#E6ECF8"
  info-blue: "#2459C4"
  success-green: "#0A7560"
  warning-umber: "#945600"
  error-red: "#C12A3A"
  night-ground: "#0E1117"
  night-surface: "#161B24"
  night-surface-bright: "#232B37"
  night-surface-light: "#1E2530"
  night-ink: "#E7EBF1"
  night-ink-muted: "#A6B0BD"
  night-line: "rgba(231, 235, 241, 0.14)"
  night-line-strong: "rgba(231, 235, 241, 0.34)"
  night-tafelblau: "#9DB6FF"
  night-tafelblau-deep: "#7F9CF0"
  night-tafelblau-tint: "#1E2A48"
  night-info: "#8AAEFF"
  night-success: "#4FD1AE"
  night-warning: "#F2B84B"
  night-error: "#FF8A93"
  dbc-red: "#8E1F2A"
  night-dbc-red: "#FF9AA2"
  cat-koralle: "#FF8A70"
  cat-senf: "#F7C948"
  cat-petrol: "#3CC4A4"
  cat-himmel: "#7EB2FF"
  cat-violett: "#B79CFF"
  cat-rose: "#FF94BD"
  cat-lime: "#B8DC5A"
  cat-orange: "#FFA95C"
  cat-schiefer: "#AEB9C7"
  cat-sand: "#D9C3A0"
  cat-tuerkis: "#5DD3E0"
  cat-pflaume: "#D59BE6"
  cat-oliv: "#C9C66A"
typography:
  symbol:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Arial, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 1.2rem + 1.6vw, 2.25rem)"
    fontWeight: 760
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 720
    lineHeight: 1.15
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 112"
  section:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 680
    lineHeight: 1.25
    letterSpacing: "0px"
    fontVariation: "'wdth' 112"
  body:
    fontFamily: "Atkinson Hyperlegible Next, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0px"
  body-small:
    fontFamily: "Atkinson Hyperlegible Next, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  label:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0px"
    fontVariation: "'wdth' 112"
  numeral:
    fontFamily: "Archivo, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "'tnum'"
rounded:
  marker: "3px"
  base: "6px"
  float: "12px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
components:
  button-primary:
    backgroundColor: "{colors.tafelblau}"
    textColor: "{colors.paper-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
  button-outlined:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
  element-tile:
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "12px 16px 16px"
    height: "188px"
  element-tile-large:
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "12px 16px 16px"
    height: "220px"
  element-tile-draft:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
  station-marker:
    rounded: "{rounded.marker}"
    size: "16px"
  legend-item:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0 12px"
    height: "44px"
  today-band:
    backgroundColor: "{colors.cat-senf}"
    textColor: "{colors.ink}"
    padding: "16px 24px 24px"
  nav-item:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-surface}"
    rounded: "{rounded.base}"
    height: "44px"
  room-symbol:
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    size: "84px"
  chip-on-tile:
    backgroundColor: "rgba(255, 255, 255, 0.72)"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
  text-field:
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
  dialog:
    backgroundColor: "{colors.paper-surface}"
    rounded: "{rounded.float}"
---

# Design System: Lernraum

<!-- Recorded from code only (nuxt-client, branch state 2026-09-25). No running backend, so no screenshots or computed-style sampling were available; every value below is read from source. Where visual evidence would normally be cited, the source file is named instead. -->

## Overview

**Creative North Star: "The Lernposter" (the classroom wall chart)**

Lernraum reads like the periodic-table poster in a chemistry room. Tasks and rooms are elements in a tile grid that has a legend. Each tile shows a monumental two-letter symbol (the course, e.g. "Ma"), an "atomic number" (the day of the due date, in tabular figures), a category fill and a small station marker for status. The chart hangs on a cool chalk-grey ground. Tiles are flat panels with a hairline edge and 6px corners. Nothing rests on a shadow. A single mustard band ("heute") marks the present across every view, the way a highlighter marks one row of a poster.

Density is operational rather than editorial. Pages are grids, lists and boards that students (often on phones) and teachers (desktop, projector) scan in a second. Two voices do all the work: Archivo, set wide and heavy, for symbols, numerals, headings, buttons and navigation, and Atkinson Hyperlegible Next for reading text on a 17px base. Colour carries category and never carries status alone. Status is a shape, and the legend explains every shape and colour on the screen.

The world rejects the category default: white SaaS cards floating on shadows, grey noise and a single corporate blue. Dark mode keeps the chart "backlit" rather than re-tinted. Category fills stay the same bright values, the ground goes to near-black, and ink stays on every fill.

**Key Characteristics:**
- Flat tiles with a 1px hairline and 6px radius. No resting shadows. Only floating layers lift.
- Category fills (13 named hues) always carry ink text (#141A22), at 7.6:1 or better in both themes.
- Status is encoded by shape plus a text label: outline = open, hatched = submitted, solid = graded, dashed = draft.
- One mustard "heute" band marks the present. Text selection uses the same mustard.
- Archivo (wdth 112–118, weight 650–800) for anything scanned; Atkinson Hyperlegible Next for anything read.
- Tabular numerals for dates, counts and progress.
- Light, dark and system themes in the Vue client. The legacy client is light only.

## Colors

A cool, low-chroma chalkboard neutral set, one deep blackboard blue for action, and a bright poster palette used only as fills.

### Primary
- **Tafelblau** (blackboard blue): the one action colour. It is used for primary buttons, links, focus rings, selected tabs, form-field focus, progress bars and the board card's editing ring. **Tafelblau Deep** and **Deepest** are its darker steps, from the Vuetify `darken` variants. **Tafelblau Tint** is the pale wash behind primary-tinted areas. In dark mode it becomes **Night Tafelblau**, a light periwinkle with ink-dark text on top. Instances on the dBildungscloud default theme swap it for **DBC Red** (light) / **Night DBC Red** (dark). The federal-state themes (brb, n21, thr) use Tafelblau unchanged and carry their identity only in logo, favicon and school name.

### Secondary
- **Ink** (#141A22 in light, Night Ink in dark) doubles as Vuetify's `secondary`. It is the text colour. It fills the active navigation item, draws the 2px rule under the dashboard's task header, and forms the hover edge of tiles and cards. It is also the text colour on every category fill in both themes.

### Tertiary: category fills
- **Koralle, Senf, Petrol, Himmel, Violett, Rose, Lime, Orange, Schiefer, Sand, Türkis, Pflaume, Oliv**: the poster palette. These colours are used only as tile fills, room avatars, legend swatches and board-card tints. Server and course colours are arbitrary hex values, so `toCategoryColor` maps each one to the nearest category by hue. Colours with low saturation map to Schiefer, and browns map to Sand. A "red" course therefore stays recognisably red while every tile keeps ink-legible contrast. Room colour classes (`room-color--*`) map the 13 server room colours one-to-one onto these fills. **Senf** has a second, reserved role as the "heute" band and the text-selection highlight.

### Semantic
- **Info Blue, Success Green, Warning Umber, Error Red**: Vuetify status colours for alerts, validation and messages. Each passes 5:1 or better on the light ground. Their night variants lighten instead. The legacy client's Bootstrap brand-success/info/warning/danger colours use the same four light values. Error Red also marks overdue work, as a round swatch in the legend.

### Neutral
- **Chalk Ground** (app background) and **Night Ground**: the wall the chart hangs on.
- **Paper Surface** / **Night Surface**: tiles, cards, the sidebar, the topbar and legend buttons. **Night Surface Bright** is the raised dark surface.
- **Slate Wash** / **Night Surface Light**: quiet secondary fills.
- **Ink Muted** / **Night Ink Muted**: dates, counts, secondary text. They stay at 6:1 or better on every ground.
- **Line** (14% ink) separates everything: tile edges, the topbar bottom, the sidebar edge, dividers, list rows. **Line Strong** (32–34%) is used for outlined buttons, board cards on the board grid, the dashed draft border, scrollbar thumbs and the hatch pattern.

### Named Rules
**The Ink-On-Fill Rule.** Every category fill carries ink text (#141A22), in light and dark alike. A fill never gets white text and is never darkened for dark mode.

**The Legend Rule.** Every colour and shape on a chart surface is explained by a visible legend or text label. Colour is never the only carrier of meaning.

**The One Band Rule.** Senf as a full-width band means "today" and nothing else. Do not use it as a generic highlight colour for sections.

**The Backlit White Rule.** In dark mode the theme colour `white` resolves to Night Surface (#161B24) on purpose. Legacy components paint their surfaces with `color="white"`, and this mapping keeps them in the dark world. When you need literal white, use a hex value, not the theme colour.

## Typography

**Display Font:** Archivo (variable, weight 100–900, width 62–125%), falling back to the system stack
**Body Font:** Atkinson Hyperlegible Next (variable, weight 200–800, with italic), falling back to the system stack
**Label/Numeral Font:** Archivo with `tnum`

**Character:** Archivo set wide (wdth 112 for headings, 118 for element symbols) and heavy gives the poster voice: blunt, chart-like and legible from the back of a classroom. Atkinson Hyperlegible Next was designed for low-vision readers. It keeps letterforms such as I/l/1 and O/0 distinct, which matters for students with dyslexia. Both families are self-hosted woff2 files under OFL-1.1 (no CDN, for GDPR/DSGVO). The legacy client loads the same files from `static/styles/fonts/lernraum.css`.

**Script coverage:** Both families ship Latin and Latin Extended only, with no Cyrillic. Ukrainian (uk locale) text therefore renders in the system stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Helvetica Neue, Arial). This is known and accepted. Test Ukrainian layouts with the system face, not with Archivo metrics.

### Hierarchy
The root is 17px (`html { font-size: 106.25% }`, which respects the user's browser setting). All rem values below are based on 17px.
- **Symbol** (Archivo 800, wdth 118, 2.75rem on standard tiles / 3.5rem in the today band / 2.25rem in room avatars / 1.125rem in 44px list squares, line-height 0.95–1, -0.02em): the element symbol. Two letters, first uppercase, taken from the course name.
- **Headline / h1** (Archivo 760, fluid clamp from 1.75rem up to 2.25rem, line-height 1.1, -0.01em): page titles in the wireframe header, set next to a muted date line (Archivo 600, 1.1875rem).
- **Title / h2** (Archivo 720, 1.625rem, 1.15): major page sections, such as "Tasks" above the legend. h3 is 1.3125rem / 700.
- **Section / h4** (Archivo 680, 1.125rem, 1.25): chart section heads ("Heute", "Diese Woche"), each followed by its count in muted tabular numerals at the same size. Tile names use Archivo 700 at 1.0625rem and are clamped to three lines.
- **Body** (Atkinson 400, 1rem = 17px, line-height 1.55): reading text. Descriptive prose is capped at about 60ch, and short-width pages at 80ch.
- **Body small** (Atkinson, 0.875rem, 1.5): tile meta lines, secondary list text. Captions are 0.8125rem.
- **Label** (Archivo 650, wdth 112, 0.9375rem, no letter-spacing, sentence case): buttons, navigation items, legend items, school name. Small buttons are 0.875rem. Chips use weight 600.
- **Numeral** (Archivo 700–800, `tnum`): due-day numbers on tiles (1.25rem), legend and section counts. Apply it with the `lr-num` utility.

### Named Rules
**The Two Voices Rule.** Archivo is for what you scan (symbols, numbers, headings, controls). Atkinson is for what you read. Never set a paragraph in Archivo and never set a tile symbol in Atkinson.

**The Tabular Figures Rule.** Any number that is compared across rows or tiles (dates, counts, points, progress) uses tabular figures.

**The Sentence Case Rule.** Buttons and labels are sentence case with zero letter-spacing. The build uses no uppercase tracking anywhere.

## Layout

The shell has three parts:
- A 50px sticky topbar on Paper Surface with a bottom hairline.
- A sidebar on Paper Surface with an end-edge hairline.
- A wireframe header on Chalk Ground (24px top and side padding), with breadcrumbs and h1, and a sticky Line divider below it.

Content sits in a container padded 0 24px 24px, 32px below the header. It has three widths: short (80ch), limited (1200px) or full.

Chart grids are CSS grid `auto-fill` with 12px gaps. Standard tiles have a 230px minimum column; the large tiles in the today band have a 300px minimum. Both collapse to one column on narrow screens via `min(…, 100%)`. Tiles are at least 188px tall (220px large) and stretch to equal heights per row. The today band breaks out of the content padding (negative 24px inline margin) so it runs the full content width.

Spacing follows a 4px-based scale (4, 8, 12, 16, 24, 32, 48, 64). 12px is the in-grid gap, 16/24 is tile and panel padding, and 32/48 separates chart sections. Informational panel groups are drawn as a hairline grid: 1px gaps over a Line background inside one bordered, clipped container. They are not separate cards.

Breakpoints are Vuetify defaults via `useDisplay`. The school name and QR share appear at `md` and up, and the school logo at `lg` and up. Every touch target (nav items, legend items, list symbols) is at least 44px.

## Elevation & Depth

The chart is flat. Surfaces separate by hairline and by tonal steps (Chalk Ground, then Paper Surface, then category fill), never by shadow at rest. Cards, tiles, the topbar, toolbars and navigation drawers are set to elevation 0 or flat through global Vuetify defaults. Hover and focus change the edge, not the height: a tile gains a 2px inset ink edge, and cards and room items switch their border to ink. Only layers that genuinely float above the page (menus, dialogs, overlay sheets) lift.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 12px 32px -8px rgba(14, 17, 23, 0.28), 0 2px 6px rgba(14, 17, 23, 0.12)`): the single lift, applied to overlay cards, sheets and menu lists.
- **Ink edge** (`box-shadow: inset 0 0 0 2px #141A22`): hover, focus and legend-highlight state on element tiles. It is an inset stroke, not elevation.
- **Editing ring** (`box-shadow: 0 0 0 1px` Tafelblau): a board card in edit mode.

### Named Rules
**The Flat Chart Rule.** Nothing casts a shadow at rest. If a surface does not float over the page, it is separated by a line.

**The Edge-Not-Lift Rule.** Interactive tiles and cards respond by thickening or darkening their edge, never by rising or scaling.

## Shapes

The corners are near-square. The base radius is 6px, used for tiles, cards, buttons, text fields, label chips, legend items, nav items and room avatars. Station markers and legend swatches use 3px. Floating layers (dialogs, menu lists) use 12px, because Vuetify's `lg` is twice the 6px root radius. The only circle is the overdue swatch.

Borders are 1px Line by default. Board cards on the board grid and outlined buttons use 1px Line Strong. Tiles inside the today band use a 1px ink border. Category tiles carry their own 1px 18%-ink edge so a fill never bleeds into the ground.

The **station marker** is the recurring silhouette: a 16px square (14px in the legend) with a 2px currentColor border. It is empty for open, has a -45° hatch (2px stroke, 5px period) for submitted, is solid for graded and has a dashed border for draft. The draft tile repeats the dashed language at full size: a transparent fill with a 2px dashed Line Strong border.

## Components

### Buttons
Flat, blunt and typographic.
- **Shape:** gently squared (6px). Ripple is off globally.
- **Primary:** the flat variant is the default. It has a Tafelblau fill with white label text (Night Tafelblau with Night Ground text in dark mode). Labels are Archivo 650, wdth 112, 0.9375rem, sentence case.
- **Outlined:** a 1px Line Strong border with ink text. It reads as ink on the chart, not as a tinted pill.
- **Hover / Focus:** Vuetify overlay at 6% on hover and 12% on focus. Focus-visible draws the global 2px focus-colour outline at a 2px offset.

### Chips
- **Style:** label chips (6px), weight 600. On category tiles, chips sit on a translucent white plate (72%) with ink text in both themes. On overdue tiles, chip text is set in bold.
- **State:** informational only (member counts, "external", task status and due chips). They are not filters.

### Cards / Containers
- **Corner Style:** 6px. Dialog cards use 12px.
- **Background:** Paper Surface. Board cards may be tinted with `color-mix(in oklab, <category> 34%, surface)`, with the border mixed at 70% toward Line Strong.
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** 1px Line. On hover or focus the border turns ink, and on edit it gets the Tafelblau ring.
- **Internal Padding:** 12–24px on the spacing scale.

### Inputs / Fields
- **Style:** outlined, comfortable density, 6px radius, Tafelblau as the active colour. Selects, autocompletes, file inputs and textareas are the same.
- **Focus:** Vuetify's outlined focus, where the outline thickens and turns Tafelblau.
- **Switches:** inset and flat. Progress bars are Tafelblau, 6px high, with rounded ends.

### Navigation
- **Sidebar:** Paper Surface with an end hairline. Items are at least 44px tall with 6px corners, Archivo 600 at 0.9375rem and wdth 112, with an icon and a label. Hover is a 6% overlay. The **active item is a filled ink tile** (ink background, surface-coloured text), so it is readable by shape rather than by a coloured stripe. The legacy client's sidebar uses the same ink tile in light mode.
- **Topbar:** 50px, sticky, Paper Surface, bottom hairline, flat. The school name is Archivo 600, 0.9375rem. The user menu holds the System / Light / Dark theme toggle, which is stored in `localStorage["lernraum.theme"]` and read before mount so dark mode does not flash light.
- **Mobile:** the sidebar collapses behind a menu icon in the topbar.

### Element Tile (signature)
The unit of the chart. It is a link to the task: a category fill with ink text and a 1px 18%-ink edge, in a four-row grid.
- **Top row:** the symbol at top left (Archivo 800, wdth 118) and the due day at top right (tabular numeral).
- **Station marker:** pinned at the top-right corner (12px inset). The marker is `aria-hidden` (with a tooltip title), and the tile's chips carry the status in words.
- **Body:** the task name (three-line clamp), then a meta line (course · "due …", 0.875rem, 88% opacity), then status chips.
- **Hover and focus:** a 2px inset ink edge. Focus-visible adds the focus outline at a 3px offset.
- **Load:** a one-time ease-out entrance (420ms, 6px rise, 30ms stagger capped at 12 tiles). It is turned off under reduced motion.

### Legend Bar (signature)
It sits next to the h2, above a 2px ink rule. Each entry is a 44px button with a Paper Surface fill, a 1px Line border and 6px corners, containing a station swatch, a label and a count in heavy tabular figures. The entries are Open, Submitted, Graded, Overdue (Error Red circle) and Draft. Hovering or focusing an entry highlights its matching tiles with the ink edge and steps every other tile back. Clicking pins the filter (`aria-pressed`), shown by an ink border plus a 1px inset ink ring.

### Today Band (signature)
A full-bleed Senf band with ink text and 16/24px padding, containing the tiles due today at the large size, with ink borders. It appears once per view.

### Room Element
An outlined card holding an 84px category-filled square that shows the room's two-letter symbol (Archivo 800, wdth 118, 2.25rem, ink), next to the room name in bold body text and small member and external chips. Hover and focus-within turn the border ink and add the focus outline. The task list rows use a 44px version of the same symbol square with bottom hairline separators.

## Do's and Don'ts

### Do:
- **Do** separate surfaces with a 1px Line hairline and a tonal step. Use the Float shadow only on menus, dialogs and overlay sheets.
- **Do** put ink text (#141A22) on every category fill, in both themes, and map arbitrary server colours through `toCategoryColor` rather than using them raw.
- **Do** encode status by station shape (outline / hatched / solid / dashed) and always pair it with a text label or chip. Overdue adds Error Red and text, and is never red alone.
- **Do** set symbols, numerals, headings, buttons and navigation in Archivo (wdth 112–118) and reading text in Atkinson Hyperlegible Next at the 17px base. Use tabular figures for any compared number.
- **Do** keep touch targets at least 44px and use the global focus ring (2px, Tafelblau or Night Tafelblau, 2px offset).
- **Do** route every duration through the motion tokens so reduced motion sets them to 0ms. Tile entrance animations must also be switched off explicitly.
- **Do** add every new colour to both `lightColors` and `darkColors` in `lernraum-palette.ts` and mirror it in `tokens/_color.scss`, checking contrast against surface, background and surface-light.

### Don't:
- **Don't** give resting cards, tiles, toolbars or alerts a Vuetify `elevation` or a drop shadow.
- **Don't** lift, scale or translate a tile on hover. Change its edge.
- **Don't** use a category fill as a status colour, or a status colour as a category fill.
- **Don't** use Senf as a band for anything but "today".
- **Don't** put white text on a category fill, or darken the fills for dark mode.
- **Don't** use the theme colour `white` expecting literal white. In dark mode it is Night Surface.
- **Don't** add uppercase tracked labels. Controls are sentence case with zero letter-spacing.
- **Don't** load fonts, icons or scripts from a third-party CDN.
- **Don't** assume Archivo or Atkinson metrics for Ukrainian text. It renders in the system stack.
