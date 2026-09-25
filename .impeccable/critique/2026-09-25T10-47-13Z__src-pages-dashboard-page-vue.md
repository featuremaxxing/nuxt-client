---
target: Dashboard / Heute home flow
total_score: 12
max_score: 32
na_heuristics: 5,9
p0_count: 1
p1_count: 1
target_identity: "file:/Users/johannes/vibe/featuremaxxing/nuxt-client/src/pages/Dashboard.page.vue"
target_fingerprint: "sha256:5c04d313b2de8a033b984e91d8387d474ee96b1db24ef7d42c9d2e87fedfb99a"
target_path: /Users/johannes/vibe/featuremaxxing/nuxt-client/src/pages/Dashboard.page.vue
timestamp: 2026-09-25T10-47-13Z
slug: src-pages-dashboard-page-vue
closed: true
---
Method: dual-agent (A: Explore/design-review · B: Explore/detector-evidence). Browser visualization skipped in both assessments: no runnable dev server / backend stack in this session.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Two different loading idioms on one page (spinner vs. plain text) |
| 2 | Match System / Real World | 2 | No "Today" chunking despite the flow being named "Heute" |
| 3 | User Control and Freedom | 2 | "New Features" grid has no dismiss; release dialog hard-reloads via `window.location.href` |
| 4 | Consistency and Standards | 2 | Task cards are `VCard href` links, assignment rows are `VListItem @click` — same intent, two patterns |
| 5 | Error Prevention | n/a | Read-only display surface, little destructive input to guard |
| 6 | Recognition Rather Than Recall | 2 | Card-level info is good, but no glance-level "N overdue" summary |
| 7 | Flexibility and Efficiency | 1 | No filter/sort/collapse on the dashboard itself |
| 8 | Aesthetic and Minimalist Design | 1 | Announcement + 2 alerts + 4 promo cards before any task content |
| 9 | Error Recovery | n/a | No error-prone input on this surface |
| 10 | Help and Documentation | 2 | Help exists in sidebar, nothing contextual on the dashboard |
| **Total** | | **12/32** | **Poor** (37.5%) |

## Design Specificity Verdict

**LLM assessment:** Reads as a competently assembled, near-stock Vuetify admin dashboard with a school data model bolted on, not a home screen shaped around how a student or teacher actually starts their day. Evidence: the page opens with Announcement → admin/maintenance alerts → 4 hardcoded marketing cards ("New Features") *before* any task appears, for every role; task cards are differentiated only by a 4px colored left border; there's no "Today/This week" framing anywhere despite the page being the "Heute" home. Real brand investment exists at the token level (PT Sans/PT Sans Narrow, per-Bundesland palette), but the composition itself is generic SaaS-dashboard IA.

**Deterministic scan:** `impeccable detect` on the dashboard/layout scope found 1 confirmed finding — `side-tab` (colored 4px left border) at `DashboardTasksSection.vue:9`, real, not a false positive. A wider scan of the whole `src` tree found 5 total findings (3× side-tab, 2× layout-property-transition), so this is not systemic "AI slop"; the deeper problems are compositional (what's shown, in what order) rather than surface decoration.

**Additional mechanical findings (Assessment B):**
- `Topbar.vue:104` — hardcoded `background-color: #fff !important`, bypasses theme tokens, breaks any future dark theme.
- `Topbar.vue:5-11` and `Sidebar.vue:5-12` — icon-only sidebar toggle buttons with no `aria-label` (real WCAG gap, confirmed by grep + context read).
- `CloudStatusMessages.vue:58` — fixed `width: 400px` (not `max-width`) on a dropdown panel; moderate-confidence overflow risk on narrow viewports.
- Detector exits with code 2 on non-empty findings while still printing valid JSON — a caller-side quirk worth remembering, not a product issue.

No user-visible overlay: browser injection was not attempted (no reachable dev server), so there is no live-tab visualization to point to — every finding above is source-verified instead.

## Overall Impression

Solid engineering scaffolding (role-aware task splitting, real a11y groundwork in the shell: skip link, aria-live regions, mostly-correct icon-button labeling elsewhere) wrapped around a page that talks to the user about the product before it tells them what they need to do. The single biggest opportunity: reorder and re-scope the page so "what's due, today" is the first thing rendered, and demote or remove the promotional block.

## What's Working

- Role-aware content (teacher vs. student sections, drafts, feature-flagged assignment tool) is cleanly factored in the data layer (`useTasks`, `isTaskOverdue`).
- The empty-state (`EmptyState` + `SvgTasksEmpty`) is genuinely warm: custom illustration, calm copy, the one moment on the page with real emotional care.
- Accessibility intent is present at the shell level (`SkipLink`, `aria-live` polite/assertive regions in `DefaultWireframe`, correct `aria-label` passthrough on `TopbarItem`) — it's inconsistently applied, not absent.

## Priority Issues

**[P0] Primary task content is buried below promotional/system chrome**
- Why it matters: every role, every visit, sees Announcement → conditional admin/maintenance alerts → 4 marketing cards before their own tasks. This defeats the purpose of a "Heute" home screen and directly contradicts didactic principle #1 (orientation before decoration) in PRODUCT.md.
- Fix: move "New Features" to a dismissible, one-time surface (first-login or a bell/changelog entry point) or below the fold entirely; task content becomes the first thing rendered after the page header.
- Suggested command: `/impeccable distill` then `/impeccable layout`

**[P1] No "Today" temporal framing or at-a-glance count**
- Why it matters: the flow is literally named "Heute" but nothing groups by day; a student must read every card's relative-date string to know what's due today vs. later. Violates didactic principle #4 (Feed up/back/forward — the goal and the "now" must be visible).
- Fix: group by Today / This Week / Later (or similar), and show an overdue/due-today count near the page title, not just inside section headers.
- Suggested command: `/impeccable shape` (for the grouping model) then `/impeccable layout`

**[P2] Inconsistent loading and interaction patterns on one page**
- Why it matters: spinner vs. plain-text loading, `VCard href` vs. `VListItem @click` for conceptually the same "open my work" action — breaks the sense of one coherent screen (heuristic #4).
- Fix: standardize on one loading idiom and one card/list interaction pattern across `DashboardTasks*` and `DashboardAssignments`.
- Suggested command: `/impeccable extract` (pull a shared pattern) then `/impeccable polish`

**[P2] Deficit-framed status with no positive counterpart**
- Why it matters: overdue/not-graded states use warning-red chips; nothing on the dashboard celebrates on-track/completed status. For Sek-I students this sets a punitive tone before anything encouraging appears — conflicts with didactic principle on motivation (SDT: competence should feel earned, not just deficit-flagged).
- Fix: add a completion/on-track indicator at parity with the overdue chip (e.g., a quiet "3 of 5 done" or "all caught up" state), consistent with the existing board-progress pattern already in the codebase.
- Suggested command: `/impeccable colorize` (re-balance the palette away from all-warning) then `/impeccable delight`

**[P3] Release-notes dialog forces a hard page reload**
- Why it matters: `window.location.href = "/system/releases"` breaks SPA flow right after an otherwise pleasant "surprise" moment.
- Fix: route via the Vue router instead of a full navigation, once `/system/releases` (or an equivalent) is reachable in-app.
- Suggested command: `/impeccable harden`

## Persona Red Flags

**Jordan (confused first-timer / younger student):** must parse relative-date strings across an undifferentiated card grid to find what's urgent (no "Today" grouping — high working-memory demand); the first thing on the page is abstract product marketing (AI questions, learning rooms) with no context for a new user; red "overdue" chips with a clock-alert icon are the most visually salient element on the page and could read as a personal failure notice before the student has even learned the system; cards are click/href-driven with no stated "open" affordance beyond cursor/hover.

**Sam (accessibility-dependent user):** the sidebar open/close toggle buttons have no `aria-label` (confirmed) — a screen-reader user gets no accessible name for the primary navigation control; `DashboardAssignments`'s loading state is a bare text caption with no visible `aria-live`/`role="status"` wrapping, so a completed load may not be announced; the sidebar's `scrollbar-color: transparent transparent` (revealed only on `:hover`) risks hiding overflow-scroll affordance for touch/keyboard/motor-impaired users.

## Minor Observations

- `@dragstart.prevent` on task cards suggests a disabled/half-finished drag-reorder feature — worth a product decision (build it or remove the dead code) rather than carrying silently.
- The "New Features" array is hardcoded in the page component (not CMS/config-driven), which both explains why it feels bolted-on and means every release needs a code change plus new keys in all four locale files.
- `Topbar.vue`'s hardcoded `#fff` is a small but real theming inconsistency versus the token usage elsewhere in `DefaultWireframe`.
- Stacking worst-case: a migration/maintenance day could show 3 stacked alert-style banners plus the 4-card promo grid before any task content — worth explicitly designing for that combined state, not just the common case.

## Questions to Consider

1. If this page is meant to answer "what do I need to do today," why does nothing on it group or label anything by day?
2. Whose problem does the "New Features" grid solve — the user's or the product's? What breaks if it becomes a one-time, dismissible surface instead of permanent chrome?
3. Is deficit-framing (overdue, not-graded) the right default emotional register for a platform used daily by children as young as Sek I?
