# Popcorn Batch — 0.4.0 overhaul

## Objective
Ship Popcorn Batch 0.4.0: the rename from Szalinski (a separate task) and a redesign that makes the web UI a member of the Popcorn family defined by `DESIGN.md`, whose tokens match Popcorn SR's. What the app does, its routes, its plain-language copy and its verification stay as they are, except where this plan says otherwise.

## Acceptance
- The UI uses only `DESIGN.md` values: system sans, zinc neutrals, blue-500 as the one accent with dark text, emerald/amber/red as status indicators only, 8px control and 16px panel radius, 44px targets, no shadows, no gradients, no Newsreader, DM Sans or JetBrains Mono.
- The shell matches Popcorn SR: a 228px sidebar, a compact top block at 800px and below, the navigation Overview, Libraries, Queue, Settings, the wordmark "Popcorn Batch", a skip link and focus that follows the screen.
- Every screen below is restyled as specified; light and dark follow the system only.
- New setting `popcorn_sr_url` (server, API, UI, mock API, docs) with an "Open Popcorn SR" link and no network calls.
- The new icon (once the owner approves it) is the favicon, the sidebar mark and the Unraid icon.
- The verification checklist at the end passes; existing web tests are updated, none deleted.
- Commits on main as thekozugroup@gmail.com, with no AI co-author or session lines.

## Evidence and limits
Documentation pass on 2026-10-12, from commit `cd8d5a7` (Szalinski 0.3.0, not yet tagged). No application code was changed.

Read: Popcorn SR's `DESIGN.md`, `PRODUCT.md`, `AGENTS.md`, `README.md`, `.impeccable/design.json`, `.impeccable/surfaces/popcorn-sr-static-index-html.md`, `ui.css`, `popcorn_sr/static/index.html`, `popcorn_sr/static/app.js`, `working.md`; this repository's `web/src` (globals, components, primitives, screens, `lib/theme.ts`, `lib/labels.ts`), `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md` (Web UI), `docs/screenshots/`, `web/e2e/`, `web/scripts/mock-api.mjs`, the core `Settings` type and the settings service.

Baseline at `cd8d5a7`:
- `pnpm test`: 26 files, 343 tests pass.
- `pnpm build` then `node e2e/layout.mjs`: every layout check passes (390, 320, 768 and touch 390).
- axe-core 4.10.3 (WCAG 2.0/2.1/2.2 A and AA tags) on the 19 states below at 390, 768 and 1440, light and dark: one violation, `list`, on the folder step (setup and Add library) in every theme and width. The folder `<ul>` has `<li role="presentation">` group headings as direct children.
- Horizontal overflow at 768px (both themes) on Settings › Advanced and a library's Settings tab: the "Best fit" tag of a goal card runs past the viewport (right edge 841px at a 768px viewport) in the two-column goal grid beside the 240px sidebar.
- Controls under 44px tall, counted without a touch pointer (buttons, links outside paragraphs, inputs, selects, summaries, tabs): from 1 (setup welcome) to 101 (Up next at 768 and 1440) per screen, and 126 on the library file table at 1440 (127 with a file's sheet open over it). The current design reaches 44px only with a coarse pointer (`pointer-coarse:`); the family rule asks for 44px everywhere.

"Before" evidence: `evidence/before/<state>-<width>-<theme>.png`, 114 files, for `<width>` 390, 768, 1440 and `<theme>` light, dark. The 19 states:

| State | What it shows |
| --- | --- |
| `overview` | Overview with savings, Needs your attention, Converting now, Libraries, Recently finished, the chart |
| `libraries` | The Libraries list |
| `library-files` | Demo Movies, Files tab |
| `library-file-sheet` | A file's sheet with its tracks (viewport capture) |
| `library-settings` | Demo Movies, Settings tab |
| `add-library-folder` | Add library, folder step |
| `add-library-goal` | Add library, goal step |
| `queue-running` | Queue, Running |
| `queue-next` | Queue, Up next |
| `queue-history` | Queue, History |
| `job-sheet-checks` | A verified job's sheet with its checks (viewport capture) |
| `job-sheet-attempts` | A failed job's sheet with three attempts (viewport capture) |
| `settings-processing`, `settings-output`, `settings-hardware`, `settings-advanced` | Each Settings section, with About |
| `setup-welcome`, `setup-folder`, `setup-goal` | First run (mock scenario `fresh`) |

How they were made: `web/out` from `pnpm build` served by a small Node server that proxies `/api` and the `/api/ws` WebSocket to `web/scripts/mock-api.mjs` (scenario `demo`, and `fresh` for setup; `MOCK_TICK_MS=100000` so progress holds still); Playwright Chromium 1194 with `colorScheme` light or dark, `reducedMotion: "reduce"`, device scale 1; full-page captures except the three sheets; quantized to 128 colours. In full-page phone captures the fixed bottom tab bar appears part-way down the page, an artefact of capturing a fixed element. All data in them is the mock API's fake sample data. The capture and audit scripts stayed in the session's scratch space; item 11 asks for a committed equivalent.

Limits: no real hardware, media or server was involved; nothing here is evidence that any GPU works. The Taste and Impeccable skills were not installed in this session, so this plan has had no Impeccable review. The icon is a draft for the owner.

## Decisions

| Question | Decision | Why |
| --- | --- | --- |
| Navigation | Overview, Libraries, Queue, Settings, in Popcorn SR's order | Same names as SR where the meaning matches; table in 2.2 |
| SR's "Processing" | No top-level item; hardware stays at Settings › Hardware | Batch converts on this machine and has no workers to pair. "Settings › Hardware" and `#/settings/hardware` appear in README, `docs/HARDWARE.md`, `docs/UNRAID.md`, in-app fixes and the browser e2e test |
| Library list in the sidebar | Kept, below the four items, desktop only | People switch between a few libraries often, and "Folder missing" is seen at once. It is hidden at 800px and below, as now |
| Bottom tab bar | Removed | The family's compact navigation is a top block (SR) |
| Light/dark | System preference only; the switch goes | Parity with SR, default unchanged for most people; see `DESIGN.md`, Light and dark |
| Savings chart | Stays, restyled to Action Blue, with its numbers reachable as a table | It shows real server data that answers "is it still working day by day"; section 7 |
| Status colour | Indicators only (dot, check icon, message border, bar mark); text neutral | Family rule; Popcorn SR's `DESIGN.md` is normative |
| Field borders | Zinc Status, not Zinc Divider | WCAG 1.4.11 needs 3:1 for a field's edge; same token value, different assignment |
| Destructive buttons | Secondary style with exact words, plus the existing confirmation | No red action colour in the family |
| Icons | Removed from text buttons, navigation, tags and messages; kept where they carry meaning (check, attempt, track and log rows, folder rows, icon-only buttons) | SR's controls are text-only |
| Detail sheets | Kept for job and file details | They are routed (`?job=`, `?file=`), reached from every screen, and read-only; all tasks stay inline |
| Icon | Draft `docs/redesign/icon.svg`: a zinc tile with three kernels, the top one blue | Section 9; needs owner approval |
| Popcorn SR | Optional `popcorn_sr_url` setting and a link; no calls, no status | Section 8 |

## Redesign plan

File paths are those of `cd8d5a7`. The rename task may rename crates, the binary, the image and storage keys; it does not move the files under `web/src`.

### 1. Foundations

**1.1 Tokens.** Replace the colour, font, radius and shadow part of `web/src/app/globals.css` with:

```css
@import "tailwindcss";

/* Popcorn family breakpoints (DESIGN.md, Layout). */
@theme {
  --breakpoint-roomy: 32.5625rem; /* 521px: wider than SR's stacked-controls breakpoint */
  --breakpoint-wide: 50.0625rem;  /* 801px: wider than SR's compact-navigation breakpoint */
}

@theme inline {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --color-page: var(--page);
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-line: var(--line);
  --color-subtle: var(--subtle);
  --color-field: var(--field);
  --color-accent: var(--accent);
  --color-accent-ink: var(--accent-ink);
  --color-ok: var(--ok);
  --color-warn: var(--warn);
  --color-error: var(--error);
  --color-overlay: var(--overlay);
  --radius-tag: 6px;
  --radius-control: 8px;
  --radius-panel: 16px;
  --radius-progress: 4px;
}

:root {
  color-scheme: light dark;
  --page: var(--color-zinc-50);
  --surface: var(--color-white);
  --ink: var(--color-zinc-900);
  --muted: var(--color-zinc-600);
  --line: var(--color-zinc-200);
  --subtle: var(--color-zinc-100);
  --field: var(--color-zinc-500);
  --accent: var(--color-blue-500);
  --accent-ink: var(--color-zinc-950);
  --ok: var(--color-emerald-500);
  --warn: var(--color-amber-500);
  --error: var(--color-red-500);
  --overlay: oklch(14.1% 0.005 285.823 / 0.45);
}

@media (prefers-color-scheme: dark) {
  :root {
    --page: var(--color-zinc-950);
    --surface: var(--color-zinc-900);
    --ink: var(--color-zinc-50);
    --muted: var(--color-zinc-400);
    --line: var(--color-zinc-800);
    --subtle: var(--color-zinc-800);
  }
}
```

These resolve to exactly the values in `DESIGN.md`'s frontmatter (Tailwind's own zinc, blue, emerald, amber and red), referenced the same way Popcorn SR's `ui.css` does. Remove `@custom-variant dark (…)`: Tailwind's default `dark:` variant follows `prefers-color-scheme`.

Base layer: `html` and `body` take `font-family: var(--font-sans)`, `background: var(--page)`, `color: var(--ink)`, `font-size: 1rem`, `line-height: 1.5`; `*, ::before, ::after { border-color: var(--line) }`; one focus rule, `:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px }` (drop the per-element duplicate); placeholders in `--muted`; `a { color: inherit; text-underline-offset: 3px; text-decoration-thickness: 1px }`; `code, kbd, samp, pre` in `--font-mono`; `h1, h2, h3 { text-wrap: balance }`. Delete the `--text-sm` override (15px): `text-sm` is Tailwind's 14px again and body text is 16px.

**1.2 Utility map.** Every class below changes; search for each and replace.

| Before | After |
| --- | --- |
| `bg-bg` | `bg-page` |
| `bg-sunken` | `bg-surface` (sidebar, folder-picker footer) or `bg-subtle` (code block, segmented track) |
| `bg-raised`, `bg-raised/60`, `hover:bg-raised/70` | `bg-subtle`, `hover:bg-subtle` |
| `border-line-strong`, `/60`, `/50` | `border-field` on inputs, selects, textareas, segmented, pressed filters, switch; `border-line` elsewhere |
| `text-fg`, `text-fg/85`, `text-fg/90` | `text-ink` |
| `text-accent-ink` (gold text, links, icons) | `text-ink` for text and links, `text-muted` for icons |
| `bg-accent text-on-accent` | `bg-accent text-accent-ink` |
| `bg-accent-soft`, `bg-*-soft`, `bg-accent-soft/30` | `bg-subtle` |
| `bg-meter` | `bg-accent` |
| `hover:bg-accent-hover`, `active:brightness-95` | `hover:brightness-[.94] active:scale-[.98]` |
| `text-success`, `text-warning`, `text-danger`, `text-info` on words | `text-ink` or `text-muted`; colour moves to a dot, icon or border (`bg-ok`, `text-ok` on an icon, `border-warn`, `border-error`) |
| `shadow-card`, `shadow-pop`, `ring-*` used as a selected or focus state | removed; selection uses `border-accent`, focus uses the global outline |
| `font-display` | removed (headings are `font-semibold` system sans) |
| `font-mono` on paths, formats, versions, chips | removed; kept only in `CodeBlock`, inline `<code>`, encoder names and the Ignored files textarea |
| `rounded-md` | `rounded-control` |
| `rounded-lg`, `rounded-xl` | `rounded-panel` (panels, sheets, dialogs, save bar) or `rounded-control` (goal cards, messages, menus, code blocks) |
| `rounded-full` on badges, chips, pills, meters | `rounded-tag` (tags), `rounded-control` (filters), `rounded-progress` (bars); `rounded-full` stays only on status dots, the radio indicator and the switch |
| `pointer-coarse:h-11`, `pointer-coarse:size-11` | removed; the base size is 44px (`min-h-11`, `size-11`) |
| `md:` on the shell and file list | `wide:` (801px) |
| `sm:` where rows, headers or buttons stack | `roomy:` (521px) |

**1.3 Fonts.** In `web/src/app/layout.tsx` remove the three `@fontsource-variable/*` imports; remove `@fontsource-variable/newsreader`, `@fontsource-variable/dm-sans` and `@fontsource-variable/jetbrains-mono` from `web/package.json` (and the lock file); update `web/README.md`'s note about self-hosted fonts. Delete `--font-display` and the `font-display` utility.

**1.4 Theme.** Delete `web/src/lib/theme.ts` and `web/src/lib/theme-script.ts`, the boot `<script>` and `suppressHydrationWarning` in `layout.tsx`, `ThemeSwitch` in `shell.tsx`, the Appearance row in the Settings header, and `useTheme` in `providers.tsx` (the toaster gets `theme="system"`). `viewport.themeColor`: light `#fafafa`, dark `#09090b`. Existing `szalinski-theme` / `chrysopoeia-theme` values in browsers are simply no longer read.

**1.5 Motion.** Keep the reduced-motion block, adjusted: delete `.progress-live`, `@keyframes progress-sheen`, `.bar-active`, `.bar-skipped`, the striped reduced-motion fallback of `.meter-indeterminate-band`, and `.checkbox`. Add `@media (prefers-reduced-motion: no-preference) { button, a, input, select { transition: background-color 160ms ease-out, transform 160ms ease-out } }` and SR's view entry (`.view`, 200ms, opacity and `translateY(4px)`) on the element that wraps each screen inside `<main>`. Progress fills transition `clip-path` over 200ms `ease-out`. Keep `.spin` and its slow reduced-motion speed. Remove the custom scrollbar styles and `::selection` tint.

### 2. App shell (`components/shell.tsx`, `components/brand.tsx`, `components/app.tsx`)

**2.1 Structure.** One `Sidebar` element serves every width; `MobileTopBar` and `MobileTabBar` are deleted. The frame is `display: grid; grid-template-columns: 228px minmax(0, 1fr); min-height: 100dvh` from 801px and one column below.

**2.2 Navigation mapping.**

| Popcorn SR | Popcorn Batch | Route(s) that make it current | Note |
| --- | --- | --- | --- |
| Overview | Overview | `#/` | Same meaning |
| Library | Libraries | `#/libraries`, `#/libraries/new`; `#/library/<id>` (as `aria-current="true"`, with the library's own item as `page`) | SR has one library mount; Batch watches several folders and its copy calls each one a library |
| Processing | none | Hardware: `#/settings/hardware`; processing: `#/settings/processing` | Not a separate place in Batch (see Decisions) |
| Queue | Queue | `#/queue`, `#/queue/next`, `#/queue/history` | Same meaning |
| Settings | Settings | `#/settings`, `#/settings/<section>` | Same meaning |

The main `<nav>` keeps `aria-label="Sections"` (the browser e2e test uses it). Items are text only, in the order Overview, Libraries, Queue, Settings.

**2.3 Sidebar, 801px and wider.** `position: sticky; top: 0; height: 100dvh; padding: 32px 20px; display: flex; flex-direction: column; gap: 40px; background: var(--surface); border-right: 1px solid var(--line)`.
- Brand: a link to `#/` with `aria-label="Popcorn Batch overview"`; `display: flex; align-items: center; gap: 10px; white-space: nowrap`; the 32px icon (section 9, `aria-hidden`), "Popcorn" at 19px, weight 650, letter-spacing -0.6px, and `<small>Batch</small>` at 12px, weight 500, letter-spacing 0.02em, supporting text.
- Main nav: `display: grid; gap: 6px`. Item: navigation token, `min-height: 44px; padding: 12px 14px; border-radius: 8px; text-align: left`; supporting text; hover and current: subtle fill and main text.
- Library list: `<nav aria-label="Libraries">` directly below, `margin-top: -16px` (24px from the main nav), `border-top: 1px solid var(--line); padding-top: 16px; flex: 1; min-height: 0; overflow-y: auto; display: grid; gap: 2px; align-content: start`. The visible "Libraries" label goes (the item above already says it). `LibraryLink`: `display: block; min-height: 44px; padding: 8px 14px; border-radius: 8px`; name 14px weight 500 main text, one line, truncated; state 12px supporting text, tabular. "Folder missing" gets a 7px amber dot before the words; "Scanning" loses its spinner. Current and hover: subtle fill. Last item: "Add library", same style, supporting text, never `aria-current`.
- Footer: `margin-top: auto; border-top: 1px solid var(--line); padding-top: 16px; display: grid; gap: 4px`. In order: the queue status link (2.6), the connection notice while the live connection is down, "Open Popcorn SR" when set (section 8), and "Version 0.4.0" (12px, supporting text, from `/api/system` `version`).

**2.4 Compact top block, 800px and below.** The same `<aside>` becomes `position: relative; height: auto; border-right: 0; border-bottom: 1px solid var(--line); padding: 18px 20px 8px; gap: 18px`. Row 1: brand (left) and the queue status link (right, `max-width: 12rem`, text truncated) with the compact connection notice before it while the connection is down. Row 2: main nav as `grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0`; items `text-align: center; font-size: 12px; padding: 10px 2px; min-height: 44px`. The library list and footer are `display: none`. The block scrolls away with the page; nothing is fixed to the viewport.

**2.5 Main region.** `<main id="main" tabindex="-1">` with `min-width: 0; width: 100%; max-width: 1320px; margin: 0 auto; padding: clamp(24px, 5vw, 64px); outline: none`; at 800px and below `padding: 24px 20px 48px`. `ServerDownBanner` stays first inside `<main>` as a message (no icon, no border), margin-bottom 32px. `PageHeader`: `display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 32px`; `h1` headline token (30px, 600, 1.2, -0.025em; 28px at 520px and below); description 16px supporting text, line-height 1.6, `max-width: 58ch; margin-top: 10px`; actions `display: flex; flex-wrap: wrap; gap: 8px`. At 520px and below the header stacks (gap 16px), except `inlineActions` (the library's ⋯ menu stays beside the title).

**2.6 Queue status link (`QueuePill`).** A link, not a tag: `display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 12px 14px; border-radius: 8px; font-size: 13px; color: var(--muted)`; hover subtle fill and main text. Before the words, a 7px dot: accent while converting or pausing, `--warn` for "Needs a fix", `--ok` for "Watching for new files" and "All caught up", `--field` for waiting, starting at an hour, scanning or paused. Stale state: a 7px hollow dot (1px `--field` border) and "Last known: …" as now. `queueSummary` keeps returning `text` and `tone`; its `icon` field is replaced by the dot, chosen from `tone`.

**2.7 Skip link and focus.** The skip link is the first element in `<body>`'s app frame: `<a href="#main">Skip to content</a>` styled as a secondary button, `position: absolute; top: -80px; left: 16px; z-index: 50`, and `top: 16px` on `:focus`; its click handler keeps focusing `#main`. Keep the `Shell` effect that scrolls to the top and focuses `#main` when the screen (not a query parameter) changes, `StepHeading` focusing each setup step's heading, and the sheet focusing its title and returning focus to the opener. Focus outlines: the global 2px accent outline with a 4px offset; full-width row buttons and links inside a panel (`LibraryRow`'s covering link, Recently finished and History rows, folder rows, menu items) use `outline-offset: -2px`. Replace `LibraryRow`'s `after:` ring with that outline on the covering `::after` box.

**2.8 Other frames.** `BootScreen`: the same grid with a 228px sidebar of skeletons, hidden at 800px and below. `Unreachable`, `HostNotAllowed`: centred column `max-width: 32rem`, brand, `h1` headline (was Newsreader 2.25rem), body 16px supporting text, `CodeBlock`, primary "Try again" without its icon, status text 13px. `ErrorBoundary` and Not found: `EmptyState` inside a panel, primary button without icon. Document titles become "<Screen> — Popcorn Batch" (rename task).

### 3. Primitives (`web/src/components/ui/`)

**`button.tsx`, `buttonVariants`.**

| Part | Target |
| --- | --- |
| Base | `inline-flex shrink-0 items-center justify-center gap-2 min-h-11 rounded-control border text-sm font-semibold leading-[1.4285714286] whitespace-nowrap select-none no-underline hover:brightness-[.94] active:scale-[.98] disabled:opacity-50 disabled:cursor-default disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0` |
| `primary` | `border-accent bg-accent text-accent-ink px-[17px] py-[11px]` |
| `secondary` | `border-line bg-surface text-ink px-[17px] py-[11px]` |
| `quiet` | `border-transparent bg-transparent text-muted px-2.5 py-[11px]` |
| `ghost` | merged into `quiet` with `text-ink`; replace call sites |
| `danger` | deleted; call sites use `secondary` |
| `link` | `min-h-0 border-0 p-0 text-ink underline hover:text-muted`; only for links inside a sentence. "Change folder" becomes `quiet` |
| Sizes | `sm`: `px-3`; `md`: default; `lg`: same as `md` (remove its uses); `icon` and `icon-sm`: `size-11 p-0` with a 16px glyph |
| Loading | 16px spinner then the label; `aria-busy`; keep `needsServer` |

Remove leading icons from text buttons at their call sites (Pause, Resume, Stop now, Try again, Add library, Convert, Skip, Clear selection, Check again, Copy, Remove library, Reload, Scan now in the menu keeps its menu icon).

**`controls.tsx`.**

| Component | Target |
| --- | --- |
| `fieldBase` | `w-full min-w-0 min-h-11 rounded-control border border-field bg-surface text-base leading-normal text-ink px-3 py-2.5 disabled:opacity-50 disabled:cursor-default aria-invalid:border-error` (no shadow, no ring, no hover border change) |
| `Input` | `fieldBase` |
| `Textarea` | `fieldBase min-h-24 leading-relaxed` |
| `Select` | `fieldBase appearance-none pr-10 cursor-pointer`; 16px chevron in `text-muted`, right 12px |
| `Field` | `grid gap-2`; label `text-sm font-[550] text-ink`; description `text-[13px] leading-[1.6] text-muted`; error `text-[13px] font-[550] text-ink` with a 7px `bg-error` dot before it, `role="alert"` kept |
| `SwitchRow` | `flex items-start justify-between gap-6 min-h-11`; label `text-sm font-[550]`; description `text-[13px] leading-[1.6] text-muted` |
| `Switch` | button `role="switch"` with a 44×44 hit area around a 40×24 track: off `bg-subtle border border-field`, knob 18px `bg-field`; on `bg-accent border-accent`, knob `bg-white` moved 16px; no shadow; knob moves with `transform` 160ms when motion is allowed |
| `Segmented` | group `inline-flex w-full gap-[3px] p-[3px] rounded-control border border-field bg-surface`; option `min-h-11 rounded-tag border border-transparent px-3 text-sm font-medium text-muted`; selected `bg-subtle text-ink font-semibold border-accent`; focus `has-[:focus-visible]:outline-2 outline-accent outline-offset-2`; `stackOnPhones` stacks while the nearest size container (a settings column) is under 32rem (`@lg:`), not by the screen; option words wrap, never `truncate` (design review) |
| `ChoiceCard` | `grid gap-1 rounded-control border border-line bg-surface p-5 text-left cursor-pointer hover:border-field`; checked `border-accent`; title row `flex flex-wrap items-start justify-between gap-x-3 gap-y-1` (fixes the 768px overflow); radio 16px circle, unchecked `border border-field bg-surface`, checked `border-[5px] border-accent bg-surface`; title 16px/600; description `text-sm leading-[1.6] text-muted pl-[26px]`; badge is a descriptive tag; focus `has-[:focus-visible]:outline-2 outline-accent outline-offset-4` |

**`display.tsx`.**

| Component | Target |
| --- | --- |
| `Skeleton` | `rounded-tag bg-subtle`, pulse only when motion is allowed |
| `Meter` | track `h-[5px] w-full overflow-hidden rounded-progress bg-subtle`; fill `rounded-progress` in `bg-accent` (tones: `success` `bg-ok`, `danger` `bg-error`, `muted` `bg-field`); `size` and `live` props removed (one height, no sheen). Indeterminate: a band `w-1/3 bg-accent rounded-progress` that moves only when motion is allowed; with reduced motion it is not drawn and `aria-valuetext` and the words carry the state |
| `Badge` (renamed `Tag`; the alias and the `icon` prop are removed) | `inline-flex items-center gap-[7px] rounded-tag bg-subtle px-[9px] py-[5px] text-xs leading-[1.4] text-muted whitespace-nowrap`; `tone` picks a 7px dot (`StatusDot`, which also draws the hollow last-known ring): `neutral` none, `info` `bg-field`, `accent` `bg-accent`, `success` `bg-ok`, `warning` `bg-warn`, `danger` `bg-error`; `data-tag`, so a filled row turns it to the surface colour |
| `Callout` (message) | `rounded-control border bg-subtle px-[18px] py-[14px] text-sm leading-[1.6] text-ink [overflow-wrap:anywhere]`; border `border-transparent` (info), `border-ok`, `border-warn`, `border-error`; title `font-semibold`; body `mt-1`; action `mt-3`; no icon |
| `CopyButton` | secondary, text only ("Copy", or its label); "Copied" for 1.8s; polite live region and failure toast kept |
| `CodeBlock` | `overflow-hidden rounded-control border border-line bg-subtle`; header `flex items-center justify-between gap-2 border-b border-line py-1.5 pl-3.5 pr-1.5`, label `text-xs text-muted`; `pre` `font-mono text-[13px] leading-[1.6] px-3.5 py-3`, `tabIndex=0`, wrap and max height as now |
| `EmptyState` | `px-6 py-11 text-center`, inside a panel (callers wrap it); title 16px/600; body `text-sm leading-[1.6] text-muted max-w-[42ch] mx-auto mt-2`; actions `mt-5`; `icon` prop removed; no dashed border |
| `SectionHeading` | `mt-0 mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2`; `h2` title token (20px/600/1.4/-0.025em); description `text-sm text-muted mt-1`; actions quiet buttons; keep the `quietAction` alignment |
| `Disclosure` | `<details class="border-t border-line mt-6 pt-3">`; summary `min-h-11 flex items-center gap-2 text-sm font-[550] text-ink cursor-pointer list-none`, 16px chevron in `text-muted` turning 90° when open; body `flex flex-col gap-4 pt-2 pb-2`; no box |
| `Detail` | `flex items-baseline justify-between gap-4 py-2.5`; `dt` `text-[13px] text-muted`; `dd` `text-sm font-[550] text-ink text-right break-words`; `mono` only for encoder names and raw ffprobe values, never for paths |

**`nav-tabs.tsx`.** `NavTabs`: list `flex gap-1 border-b border-line`; tab `relative -mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium`; current `border-ink text-ink`; other `border-transparent text-muted hover:text-ink hover:border-line`; count as a tag without dot (`rounded-tag bg-subtle px-1.5 text-xs text-muted tabular`) in both states. Delete the `mask-image` edge fades and their edge-measuring effect; keep sideways scrolling as a fallback and the effect that keeps the current tab in view. `Pager`: summary `text-[13px] text-muted tabular`; Previous and Next are `Button variant="secondary" size="sm"` (44px).

**`overlays.tsx`.**

| Component | Target |
| --- | --- |
| Backdrops | `fixed inset-0 z-40 bg-overlay`, opacity transition 160ms |
| `Sheet` | from 801px: `fixed inset-y-0 right-0 w-[min(34rem,100vw)] border-l border-line bg-surface`, no radius; below: `inset-x-0 bottom-0 max-h-[92dvh] rounded-t-panel border-t border-line`; enters with opacity and an 8px shift (200ms) when motion is allowed. Header `flex items-start gap-3 border-b border-line px-6 pt-5 pb-4`, title 16px/600 `break-words`, description `text-[13px] text-muted`; close `Button variant="quiet" size="icon"`. Body `px-6 py-6 overflow-y-auto overscroll-contain`. Footer `flex flex-wrap justify-end gap-2 border-t border-line px-6 py-3` plus the safe-area padding |
| `Modal` | `fixed top-1/2 left-1/2 w-[min(40rem,calc(100vw-32px))] max-h-[min(44rem,calc(100dvh-32px))] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line bg-surface`; header `px-7 pt-6 pb-3`; body `px-7 pb-5`; footer `border-t border-line px-7 py-3`; 20px horizontal padding at 520px and below; fade only (no scale) |
| `ConfirmDialog`, `UnsavedChangesDialog` | `w-[min(28rem,calc(100vw-32px))] rounded-panel border border-line bg-surface p-7 max-roomy:p-5`; title 16px/600 with `[overflow-wrap:anywhere]` (a test checks it); body `text-sm leading-[1.7] text-muted`; actions `mt-6 flex justify-end gap-2`, `flex-col-reverse` at 520px and below; Cancel secondary, confirm primary; `destructive` no longer changes the colour |
| `ActionMenu` | popup `min-w-52 rounded-control border border-line bg-surface p-1`; items `min-h-11 rounded-tag px-3 text-sm text-ink`, highlighted `bg-subtle`, icons 16px `text-muted`; destructive items keep main text; separator `h-px bg-line my-1` |
| `Tooltip` | `max-w-72 rounded-control border border-line bg-surface px-2.5 py-1.5 text-[13px] leading-snug text-ink`, fade 160ms, no shadow |

### 4. Shared components (`web/src/components/`)

- **`brand.tsx`**: `BrandMark` renders the approved icon (section 9) at 32px; `Brand` renders the mark, "Popcorn" and `<small>Batch</small>` with the measurements in 2.3.
- **`status.tsx`**: badges become tags with a dot (tone table in `DESIGN.md`, Colors › Status). Mapping: `pending` ("To convert") `info` (the Zinc Status dot of a waiting state, as `DESIGN.md`'s status table says), `queued` `info`, `processing` and `running` `accent`, `done` and Verified `success`, `skipped`, Kept original, Kept as converted, `cancelled`, Moved or changed `neutral` with a `--field` dot, `failed` `danger`, Needs a fix and Can't be read `warning`. Remove the spinner from the running tag. `CheckIcon` keeps its 16px icons in `text-ok`, `text-warn`, `text-error`, `text-field`, and the hidden status word. `EncoderBadge` becomes a descriptive tag ("NVIDIA GPU", "CPU") without tooltip or `tabIndex`; the encoder name is shown in Technical details.
- **`jobs.tsx`**: `JobCard` becomes the job row in `DESIGN.md` (still an `<article aria-labelledby>` with `min-w-0`; layout and unit tests rely on both): `grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5 px-6 py-5` inside a panel, one row per job with `border-b border-line` between; actions on the right, under the content at 520px and below. `JobCardSkeleton` matches. `StageSteps` per `DESIGN.md` (done check in `text-muted`, current dot `bg-accent`, not-reached ring `border-field`, connectors `h-px w-3 bg-line`); keep the one-line phone form ("… · step 3 of 4"). `JobProgressBlock`: 5px meter, words `text-[13px]`, lead `font-semibold tabular`. `attemptLine`: `text-[13px] text-muted` after a 7px `bg-warn` dot (was amber text). `SheetSection`: `h3` 14px weight 550, margin-top 24px, no box. `BeforeAfter`: no sunken box; two values at 16px/600 tabular with labels `text-[13px] text-muted`, an arrow icon in `text-muted`, the meter, and the savings sentence `text-sm font-[550] text-ink`. `Checks` and `Attempts`: check and attempt rows (top divider, dividers between, `py-3`), lead sentence `text-sm font-[550]`, footer line `text-[13px] text-muted`. "What changed" notes: rows with a 16px info icon in `text-muted`. `JobTechnical`: the Disclosure with "Copy for a bug report" (secondary) first, `Detail` rows, `CodeBlock`s. `JobSheetActions`: the single next action (Try again, Convert again, Convert anyway) is primary; the rest secondary.
- **`files.tsx`**: `Tracks` and `StreamRow` become track rows: no enclosing border, top divider and dividers between, `flex gap-3 py-3`, kind icon 16px `text-muted`, title `text-sm font-[550]`, details `text-[13px] text-muted` (not truncated; a test checks it), release title one line with `truncate` and `title` (a test checks it), Default and Forced as descriptive tags. `StatusExplanation`: a message with the matching border. `FileTechnical`: Disclosure with `Detail` rows. `FileSheet` description (the relative path) in sans, wrapping.
- **`library-bar.tsx`**: `LibraryBar` track `h-[5px] rounded-progress bg-subtle gap-px`; segments: converted `bg-accent`, skipped `bg-field`, couldn't convert `bg-warn` at the end; the "In queue or converting" segment is no longer drawn (it is part of the empty track and stays in the legend and the `aria-label` sentence). `LibraryLegend`: `text-xs text-muted gap-x-5 gap-y-1.5`, counts `font-medium text-ink tabular`; swatches 10px, `rounded-progress`, filled for drawn parts and `border border-field bg-subtle` for the empty ones. `segments()` keeps its labels and order so the words do not change.
- **`charts.tsx`**: section 7.
- **`goal-picker.tsx`**: `ChoiceCard`s as above; `Formats`: formats `text-[13px] text-muted` in sans (was mono); speed word `text-[13px] font-medium text-muted` with its 14px icon in `text-muted` (was green or red text); `blocked` adds a 7px `bg-error` dot before the words. Best fit is a descriptive tag (was accent). Grid `grid gap-3 sm:grid-cols-2`; the Your defaults and Custom cards span both columns.
- **`folder-picker.tsx`**: one panel (`rounded-panel border border-line bg-surface`). Toolbar `flex items-center gap-2 border-b border-line px-6 py-3.5` (12px 16px at 520px and below): Up one folder `icon` quiet button, breadcrumb of quiet `sm` buttons, Type a path quiet `sm`. "Your folders" row: label `text-[13px] font-[550] text-ink`, chips become filter buttons (`min-h-11 rounded-control px-3 text-sm`, pressed `bg-subtle text-ink border border-field`, others `border border-transparent text-muted`), paths in sans. Folder list: fix the axe `list` failure by rendering each group as its own `<ul aria-labelledby="…">` under a visible heading `<p id="…" class="px-6 pt-3 pb-1 text-[13px] text-muted">` ("Other folders"), keeping one roving focus index across the groups; rows `min-h-11 px-6 py-2.5 flex items-center gap-3`, icon 16px `text-muted`, name `text-sm font-[550]`, count `text-[13px] text-muted`, chevron 16px `text-muted`, highlighted `bg-subtle`. System folders: a `Disclosure`-style row. Conflict and error lines: messages with `border-warn` / `border-error` inside the panel's padding. Footer `flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3.5`: current folder `text-[13px] text-ink` wrapping (keep the hidden "Current folder:"), Use button primary. Keep every keyboard behaviour and the `aria-busy`/`inert` handling.
- **`folder-field.tsx`**, **`drive-change.tsx`**: path input with the field style and a secondary "Choose…" button; the picker opens in `Modal`; drive messages amber; "Use the drive that's there now" secondary, confirmed in `ConfirmDialog`.
- **`queue-controls.tsx`**: Stop now quiet, Pause secondary, Resume primary, text only; `compact` maps to `sm`. Dialog unchanged in words.
- **`save-bar.tsx`**: `sticky bottom-4 z-20 mt-8 flex justify-center`; bar `w-full max-w-2xl flex flex-col gap-3 rounded-panel border bg-surface px-4 py-3 roomy:flex-row roomy:items-center`, `border-line` or `border-error`; message `text-sm text-ink` (error `font-[550]`, no red text); Discard quiet, Save changes primary. No shadow; `bottom-20` for the tab bar goes.
- **`hints.tsx`**: messages (error `border-error`, warning `border-warn`, info no border) with the fix `CodeBlock`.
- **`profile-editor.tsx`**: its sections use the settings-section layout (`SettingsSection` in `components/settings-section.tsx`: `grid gap-4 border-t border-line py-6 @3xl:grid-cols-[15rem_minmax(0,1fr)] @3xl:gap-10` inside the `@container` settings panel, heading 16px/600, description `text-sm leading-[1.7] text-muted`); quality and speed `Segmented`; help lines `text-[13px] text-muted`; "More format options" toggle becomes a `Disclosure`-style summary row (44px); the info line inside becomes a message; field errors use `Field`. Inputs that hold paths or numbers drop `font-mono`.
- **`file-name.tsx`**: unchanged (the episode-first cut, `data-file-tail` and the hidden full name are tested).
- **`providers.tsx`**: `Toaster theme="system" position="bottom-right" offset={16} mobileOffset={16}`; classes: toast `!rounded-control !border !border-line !bg-surface !text-ink !shadow-none !font-sans`, success `!border-ok`, error `!border-error`, description `!text-muted`, action `!bg-accent !text-accent-ink !font-semibold`, cancel `!bg-subtle !text-ink`. Design review: no icon (`icons` set to null), no close button, `![box-shadow:none]`, and the family's focus outline (`focus-visible:!outline-2 !outline-offset-4 !outline-accent`), since sonner's unlayered styles remove the outline.

### 5. Screens

**5.1 Setup / first run (`screens/setup.tsx`, `screens/library-steps.tsx`).**
- Keep: welcome → folder → goal, Skip for now, focus on each step's heading, the step headings ("Make your video library smaller, safely.", "Where are your videos?", "What should happen to these videos?"), Choose a folder, Start, `HardwareLine`, primary first in the DOM.
- Restyle: page `bg-page`, content `max-w-3xl mx-auto`, padding as `<main>`. Header: brand left, "Step 1 of 3" right (`text-[13px] text-muted`, plain text instead of `role="img"`). Headings: headline token, margin-top 40px (24px at 800px and below). Lead paragraph 16px supporting text, `max-w-[58ch] mt-2.5`. The three reassurances: `grid gap-6 wide:grid-cols-3` (gap 16px stacked), each `border-t border-line pt-5` with a 16px/600 title and `text-sm leading-[1.6] text-muted` text, no icons. Actions: `mt-10 flex flex-col gap-3 roomy:flex-row-reverse roomy:items-center roomy:justify-between`; Choose a folder primary (default size), Skip for now quiet. Folder step: the picker as in section 4. Goal step: the chosen folder as a toolbar row (`rounded-control border border-line bg-surface px-4 py-2.5`, path `text-sm text-ink` wrapping, "Change folder" quiet button); goal cards; Library name `Field` `max-w-sm`; errors as an error message (was a red tint with red text); Start primary and Back quiet; the closing note `text-[13px] text-muted`.
- Remove: Newsreader headings (2.75rem/3.5rem), the dot stepper, the tinted icon circles, `size="lg"`, the folder icon in accent.

**5.2 Overview (`screens/overview.tsx`).**
- Keep: the order (saved amount and status, Needs your attention, Converting now, Libraries with Recently finished, the chart), every sentence from `overviewStatus`, `SavedHero`, `problemsFrom` and the empty-library Welcome, the Resume button, Review and Try again, `LiveUpdatesOff`.
- Restyle:
  - Saved amount: the visible `<h1>` replaces the hidden "Overview" heading: `<h1 class="flex flex-wrap items-baseline gap-x-3"><span class="text-5xl max-roomy:text-[2.5rem] font-semibold leading-[1.1] tracking-[-0.025em] tabular text-ink">612 GB</span><span class="text-xl font-semibold text-muted">saved</span></h1>`. "saved" stays its own element (the browser e2e test looks for it). The unit is no longer half-size or gold. With nothing saved yet, the `h1` is the headline-token title ("Getting to know your library", …).
  - Under it: the sentence `text-base leading-[1.6] text-muted max-w-[58ch] mt-3` (projected amount `font-semibold text-ink`); the status line `mt-5 flex items-center gap-2 text-base` with a 7px dot (accent converting or scanning, `--ok` all caught up, `--warn` waiting for a fix, `--field` paused, waiting or copying) instead of the icon, text `font-[550]`, detail `text-muted`, Resume primary beside it; holdings `text-[13px] text-muted mt-3`.
  - Grid: `flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-x-10` as now (40px gaps).
  - Needs your attention: `SectionHeading` and one panel; each problem is a row: a 7px dot (`--warn` for setup, unreadable and moved; `--error` for failed conversions) then the title `text-base font-[550]`, detail `text-[13px] text-muted`, reasons `mt-2 border-l border-line pl-3 text-[13px] text-ink`, actions on the right (Review or the settings link as secondary `sm`, Try again secondary `sm`), under the text at 520px and below. Cause icons are removed.
  - Converting now: title, then Open queue (quiet), Stop now (quiet), Pause (secondary) on the right; one panel of job rows instead of the two-column card grid.
  - Libraries: one panel of library rows (`px-6 py-5`, 18px at 520px and below); name `text-base font-[550]`, saved `text-sm text-ink tabular`; status line `text-[13px] text-muted`; "6 to review" is an inline underlined link in main text; the copying line without the hourglass; the bar; legend row `border-t border-line px-6 py-3.5`, shown from 521px.
  - Recently finished: one panel; rows are buttons `w-full px-6 py-4 text-left hover:bg-subtle` with the name `text-sm font-[550]`, the status tag on the right, `WasName`, the note `text-[13px]` (`text-ink` for done, `text-muted` otherwise, two lines), library and time `text-xs text-muted`.
  - Chart: section 7, in the right column from 1024px, last on narrower screens.
  - Welcome without libraries: headline `h1`, lead paragraph, Choose a folder primary (default size), `HardwareLine` `text-[13px] text-muted`, then Needs your attention.
- Remove: the 4.25rem/5.5rem Newsreader number and its gold unit, coloured status icons, card shadows and gold.

**5.3 Libraries list (`screens/libraries.tsx`).**
- Keep: header, description, Add library, `LibraryRow`, empty state and copy.
- Restyle: Add library primary without icon; rows in one panel; skeletons `h-[88px]` in a panel; empty state inside a panel without icon or dashed border.

**5.4 Add library and the goal picker (`screens/add-library.tsx`, `screens/library-steps.tsx`, `components/goal-picker.tsx`).**
- Keep: the two steps, the hidden step labels ("Add a library, step 1 of 2"), Cancel, Back, the folder error sent back to step 1, the defaults card, the hardware-pending note.
- Restyle: as 5.1 inside the shell (`max-w-3xl`); Cancel is a quiet button-link.
- Remove: icons in Back and Cancel.

**5.5 Library detail (`screens/library.tsx`).**
- Header: `h1` (headline) with the ⋯ menu (secondary icon button) beside it at every width. Meta line `mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5`: path `text-[13px] text-muted` in sans, wrapping (was mono, cut); goal as a descriptive tag (was gold); Paused tag with a `--field` dot; "Scanned 1 h ago" `text-xs text-muted`.
- `FolderProblem`, `SetupNotice`, `ScanBanner`: messages (`border-warn` for the folder and setup problems, none for the scan), actions secondary.
- `Summary`: padded panel (`p-7`, `p-5` at 520px and below); the count line `text-base` with the count `font-semibold`; "453 GB saved" `font-semibold text-ink` (was gold); total `text-muted`; the copying line without icon; the bar; the legend from 521px.
- Tabs: Files (count) and Settings, `mt-8 mb-6`.
- Files tab: search `Input` with a 16px search icon inside on the left (`pl-10`), `max-w-sm`; Sort by `Select` (`w-44`) with its label from 521px, the icon button over a native select below. Status filters: filter buttons with counts (`min-h-11 rounded-control px-3 text-sm`, pressed `bg-subtle text-ink border border-field`, count `text-xs tabular`), wrapping from 521px and scrolling sideways below; keep `aria-pressed`, the help `title`s and the keep-in-view effect. Action row as now; while files are selected it is `sticky top-0` at every width (was `top-14` under the phone top bar) with `bg-page border-b border-line py-2`. Table from 801px (was 768px): one panel, header cells `text-xs font-medium text-muted px-6 py-3`, body cells `text-sm px-6 py-3`, name button with `FileName` (`font-[550]`) and the folder `text-xs text-muted`; selected row `bg-subtle`; "larger" in main text with a 7px `bg-warn` dot (was red text). Checkboxes: native 18px with `accent-color: var(--accent)` inside a label that pads to 44×44 (`-m-[13px] p-[13px]`). File rows below 801px: one panel, `flex items-start gap-3 px-4 py-3`. `Pager`. Empty, no-match and scanning states inside a panel. Skip and Convert confirmations unchanged in words.
- File sheet (`?file=`): section 4, `files.tsx`; details rows in sans; the history list as rows (tag, time, "Was …", note on the right).
- Settings tab: settings sections (Library: Name field, Active or Paused with Pause/Resume library secondary; the profile editor; Remove library with a secondary "Remove library…" and the confirmation), the save bar.

**5.6 Queue (`screens/queue.tsx`, `components/jobs.tsx`).**
- Keep: tabs and their counts, the queue sentence, every empty state, Move to top and Remove with their file-named `aria-label`s, Try again / Queue again, Clear history with its confirmation, the Log, the pager, the stale note.
- Restyle: Running is one panel of job rows (was a two-column card grid). Up next: one panel of ordered rows `flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5`, position `w-7 text-right text-[13px] text-muted tabular`, name button and metadata line, actions quiet `sm` on the right (under the content at 520px and below). History: Clear history quiet `sm` above on the right; rows with the name, status tag, `WasName`, note and library · time; Try again / Queue again secondary `sm`. Log: `Disclosure` without box; entries `flex gap-2.5 text-sm`, 16px icon (`text-muted` info, `text-ok`, `text-warn`, `text-error`), the hidden level word, message `text-ink`, time `text-xs text-muted`.
- Job sheet (`?job=`): header (file name, "Conversion details"); status tag and "Finished 55 min ago" `text-[13px] text-muted`; while running the stage line and progress; the outcome message (`border-ok` verified, `border-warn` kept or needs a fix, `border-error` failed) with the sentence about the original; Attempts; What changed; Size; Checks (heading "Checks" kept for the e2e test); Details; Technical details with Copy for a bug report first. Footer: the next action primary (Try again, Convert again), Show file and Stop converting secondary.
- Remove: card shadows, the gold "working" sheen, coloured attempt text, icon-bearing buttons.

**5.7 Settings (`screens/settings.tsx`, `screens/settings-hardware.tsx`).**
- Keep: the four sections and their routes (`#/settings/processing`, `/output`, `/hardware`, `/advanced`, and `verification` mapped to Output), the shared draft and save bar, `?focus=` scrolling to a setting, every setting, label and help sentence, About.
- Header: headline "Settings" with the current section's description as subtitle; the Appearance row goes.
- Section navigation: from 1280px (design review; it was 1024px) a `<nav aria-label="Settings sections">` column (`xl:grid xl:grid-cols-[11rem_minmax(0,1fr)] xl:gap-10`) of navigation items (`min-h-11 px-3.5 py-3 rounded-control text-sm font-medium`, current `bg-subtle text-ink`, `aria-current="page"`), sticky at `top-8`; below 1280px the same items in a wrapping row (`flex flex-wrap gap-1.5 mb-8`), replacing the gold-ringed pills.
- Content: one padded panel per section (`SETTINGS_PANEL`: `@container rounded-panel border border-line bg-surface p-7`, `p-5` at 520px and below) holding `SettingsSection`s (the former `Block`, merged): `grid gap-4 border-t border-line py-6 first:border-t-0 first:pt-0 last:pb-0 @3xl:grid-cols-[15rem_minmax(0,1fr)] @3xl:gap-10`, heading 16px/600, description `text-sm leading-[1.7] text-muted max-w-[68ch]`, controls `@container max-w-2xl flex flex-col gap-5`. A library's Settings tab uses the same panel and sections.
- Processing: Files at once choice cards and the stepper (`inline-flex items-center rounded-control border border-field bg-surface`, − and + as 44px quiet icon buttons, the number input `w-12 text-base font-semibold tabular`); When to convert selects; Finding files switches and the rescan select.
- Output (folders): Finished files choice cards with the output folder `FolderField` inside the selected card; `FolderDriveNotice` and `RecentProblem` messages with `border-warn`; Keep file dates switch; Checks before replacing: the switch, three choice cards with "Recommended" as a descriptive tag, and the checks-off warning message with `border-warn`; Work folder choice cards and `FolderField`.
- Hardware: one panel (design review): This machine, then Setup tips and Preferences as settings sections, then the Details disclosure. The hardware summary in `DESIGN.md` replaces the three device cards: heading "This machine" (title token; kept for the e2e test) with Check again secondary; "Checked 3 h ago · running in a container" `text-[13px] text-muted`; the `machineSummary` sentence `text-base text-ink`; detail rows (Processor: model, then cores in metadata; Memory: size, then free or container limit; one row per GPU: name, then driver and render node in metadata, sans) in the style of SR's `worker-detail` (`flex justify-between gap-5 border-t border-line pt-4 mt-4 text-[13px] text-muted`, values `text-sm font-[550] text-ink`); a row of descriptive tags for each format whose test encode passed ("HEVC · NVIDIA GPU", "H.264 · NVIDIA GPU", "AV1 · CPU"), built only from encoders whose cell is "works". The detecting state keeps its sentence and skeleton rows. Setup tips: messages with fix code blocks. Preferences: Use for converting `Select`, If the GPU fails, try the CPU `SwitchRow`. ffmpeg missing: error message. "Details: encoders and ffmpeg": `Disclosure` with the encoder table in a panel (header cells `text-xs font-medium text-muted`, row headers `text-sm font-[550]`, each cell a 16px status icon in `text-ok`, `text-error`, `text-field` and a word in `text-ink` or `text-muted`, the encoder name `font-mono text-xs text-muted`), then the failed-test and unsupported lists.
- Advanced: Ignored files (built-in patterns in words, the textarea in `font-mono`), minimum size, Defaults for new libraries, and the new Popcorn SR block (section 8) last.
- About (below the panel, on every section): `mt-10 border-t border-line pt-6 flex flex-col gap-3 roomy:flex-row roomy:items-center roomy:justify-between`; `h2` "About" 16px/600; "Popcorn Batch 0.4.0 · build main-1a2b3c4" `text-[13px] text-muted` with version and build in `text-ink`, sans; actions: Copy for a bug report (secondary) and, when set, Open Popcorn SR (secondary link).

### 6. What goes

- **Fonts**: Newsreader, DM Sans, JetBrains Mono, their packages and imports, `--font-display`, the `font-display` utility and its uses (`app.tsx` ×2, `brand.tsx`, `shell.tsx` `PageHeader`, `library-steps.tsx` `StepHeading`, `overview.tsx` ×3, `setup.tsx`).
- **Shadows**: `--shadow-card`, `--shadow-pop`, `--shadow-color` (both themes) and every `shadow-card` (`button.tsx` ×2, `controls.tsx` ×4, `shell.tsx` ×4, `jobs.tsx`, `settings.tsx`) and `shadow-pop` (`overlays.tsx` ×6, `save-bar.tsx`, `providers.tsx`); `ring-*` used for selection.
- **Gradients and patterns**: the progress sheen, the striped "in queue" segment, the striped reduced-motion band, the `mask-image` fades on tabs.
- **Decoration**: the gold palette and its tints (`--accent*`, `--meter`, `--bar-skipped`, `*-soft`, `--info`), the alchemical BrandMark and gold favicon, tinted icon circles (setup facts, empty states), the dot stepper, dashed empty-state borders, `backdrop-blur` bars, custom scrollbars, the `::selection` tint, the theme switch, the bottom tab bar, the sticky phone top bar, the custom-drawn `.checkbox`, coloured status text, the red `danger` button, leading icons on text buttons, navigation icons, tag and message icons.
- **Uppercase eyebrows**: none exist today (no `uppercase` class; the only `tracking-` is the hero number). Popcorn SR's `ui.css` defines an uppercase `.section-label` that neither app uses; it must not be copied.

### 7. Savings chart (`components/charts.tsx`)

Decision: keep it, restyled. Popcorn SR bans decorative charts; this one is not decorative. It plots `Overview.savings_history` from the server (bytes saved and files per day for 30 days), it appears only when `worthCharting` finds at least three days with savings, and it answers a question the single total cannot: whether conversions are going steadily or stopped on some days, which matters for an app that runs unattended. PRODUCT.md's principle "show progress as outcomes" is about this kind of number. A text-only version would need a 30-row list to say the same.

Specification:
- Container: padded panel (`rounded-panel border border-line bg-surface p-7`, `p-5` at 520px and below), `figure` with `figcaption`.
- Caption: "Saved per day" in the title token (20px/600) on the left; on the right `text-[13px] text-muted tabular`: "Last 30 days · 612 GB", or while a column is hovered "Oct 11: 48 GB · 12 files".
- Plot: 128px tall; grid lines `h-px bg-line` at the top and middle and the baseline; axis labels `text-xs text-muted tabular` (maximum and 0, first day and "Today"); columns `bg-accent rounded-t-progress max-w-6`, 2px apart, at least 2% tall when above zero; the hovered column takes `brightness(.94)` (no `accent-hover` colour).
- The visually hidden table becomes visible on request: a `Disclosure` "Show the daily numbers" under the plot holding the table (caption "Space saved per day, last 30 days"; columns Day, Saved, Files; `text-sm`, header `text-xs font-medium text-muted`, rows divided by `border-line`). Keyboard and touch users get the same numbers as the hover readout.
- No legend, no colour other than Action Blue, no animation of the columns.

### 8. New setting: Popcorn SR address

- **Key**: `popcorn_sr_url`, string or null, default null. Add `pub popcorn_sr_url: Option<String>` to the core `Settings` struct (`crates/szalinski-core/src/settings.rs` before the rename; `#[serde(default)]` keeps older databases and patches working) and `popcorn_sr_url: string | null` to `web/src/lib/types.ts`. `PATCH /api/settings` merges it like the others; `GET` returns it.
- **Server validation** (the settings service's `validate`): trim; empty becomes null (`blank_to_none`); otherwise parse with the `url` crate (already in `Cargo.lock`; add it as a direct dependency of the server crate) and require scheme `http` or `https`, a host, no user name or password, and at most 2,048 characters. Errors are `invalid_settings` with `field = "popcorn_sr_url"` and the messages below. Rust tests: accepts `http://tower:8787` and `https://sr.example.com/`, rejects `javascript:alert(1)`, `ftp://tower`, `tower:8787`, `/sr`, `http://user:pass@tower:8787` and 2,049 characters, and null and "" clear it.
- **UI**: a new last block in Settings › Advanced.
  - Block title: "Popcorn SR". Block description: "Link to the Popcorn SR manager on your network."
  - Field label: "Popcorn SR address".
  - Control: `Input` with `type="url"`, `inputMode="url"`, `autoComplete="off"`, `spellCheck={false}`, placeholder `http://tower:8787`.
  - Help text: "Optional. The address you open Popcorn SR at, starting with http:// or https://. Popcorn Batch only shows a link to it and never connects to it."
  - Validation messages (client and server, same words): not a full http or https address: "Enter the full address, starting with http:// or https://, such as http://tower:8787."; contains a user name or password: "Leave out the user name and password. Popcorn SR asks for its key when you open it."; too long: "This address is too long. Use the address you open Popcorn SR at."
  - The client checks with `new URL()` before Save is enabled and shows the message under the field; a server error lands on the same field through `field`. `SECTION_OF.popcorn_sr_url = "advanced"`; "" is sent as null, like `temp_dir`.
- **Empty state**: the field is empty with its placeholder and help text; the sidebar footer and About show nothing about Popcorn SR: no link, no "Not connected", no status of any kind.
- **When set**: the sidebar footer (801px and wider) shows a quiet link "Open Popcorn SR" with a 16px arrow-up-right icon (`aria-hidden`) and visually hidden " (opens in a new tab)"; About shows the same link styled as a secondary button (the place on phones). Both are `<a href={popcorn_sr_url} target="_blank" rel="noopener noreferrer">`, rendered only after the value passed validation.
- **No calls**: Popcorn Batch never fetches, pings or embeds the address, and shows no connection state. The value is left out of "Copy for a bug report".
- **Mock and docs**: `web/scripts/mock-api.mjs` stores and validates it with the same messages (null in every scenario); `docs/ARCHITECTURE.md` lists it under Settings; `CHANGELOG.md` notes it under Added.
- **Web tests**: `settings-form.test.ts` (section, changed keys, "" to null), a unit test of the client validation with the same cases as the Rust test, and a screens test that the link appears only when set, with `target` and `rel`.

### 9. Icon

Draft: `docs/redesign/icon.svg`, preview `docs/redesign/icon-preview.png` (16, 32, 64 and 128px on light and dark, and in a browser tab). It is a 32-unit tile in Zinc Ink (`#18181b`) with Popcorn SR's brand-mark corner radius (10 of 32) holding three flat kernels in a pile: two Zinc Paper (`#fafafa`) and the top one Action Blue (`#3b82f6`), the file being worked on. No gradients, shadows or strokes; hex values because favicon and PNG tools do not read OKLCH. It reads at 16px as a small pile of dots and does not look like a menu or a face.

**Needs owner approval before use.** Once approved: replace `web/src/app/icon.svg`; use the same SVG at 32px as the sidebar mark (`BrandMark`); export a 512×512 PNG for the Unraid template's icon (`unraid/*.png`, named by the rename task) with any SVG rasterizer; keep the template's `Icon` URL pointing at `main`.

### 10. Copy: strings that must change

The rename task replaces "Szalinski" with "Popcorn Batch" everywhere; the list below is only what the redesign changes. Every other sentence stays.

| Where | Before | After |
| --- | --- | --- |
| Sidebar and Settings header (phones) | "Appearance", "Match system", "Light", "Dark" | removed |
| Sidebar | visible label "Libraries" above the library list | removed (the nav item "Libraries" is above it; the list keeps `aria-label="Libraries"`) |
| Sidebar footer | none | "Version 0.4.0" (from the server's version) |
| Overview | hidden `h1` "Overview" when space was saved | removed; the visible "612 GB saved" is the `h1` |
| Setup header | "Step 1 of 3" as `role="img"` | the same words as plain text |
| Job row | encoder tooltip "Encoder hevc_nvenc" | removed (the encoder is in Technical details) |
| Saved per day | hidden table caption "Space saved per day, last 30 days" | visible inside the new disclosure "Show the daily numbers" |
| Settings › Advanced, sidebar footer, About | none | the Popcorn SR strings in section 8, "Open Popcorn SR" and " (opens in a new tab)" |
| Brand | "Szalinski" in Newsreader | "Popcorn" with a smaller "Batch" (one accessible name: "Popcorn Batch") |

### 11. Tests, scripts and docs to update

- Keep every test file; adjust assertions only where markup changes:
  - `screens.test.tsx`: `queueSummary` keeps `text` and `tone`; drop any use of `icon`.
  - `library-waiting.test.tsx`: `LibraryLink` stays, so its cases stand.
  - `jobs.test.tsx`: the running job stays an `<article>` with `min-w-0`.
  - `outcomes-ui.test.tsx`: the dialog title keeps `[overflow-wrap:anywhere]`.
  - `track-list.test.tsx`: the release title keeps `truncate`, the details line does not.
  - `file-name.test.tsx`: unchanged.
  - Add the Popcorn SR tests in section 8 and a test that the chart's disclosure holds the daily rows.
- `web/e2e/layout.mjs`: keep its checks; add the 44px target check, the 800px compact navigation (no sidebar `aside` wider than the viewport, no element fixed to the bottom), and `#/settings/advanced` and `#/library/<id>/settings` at 768px (the overflow found above).
- `web/e2e/smoke.mjs`: should pass unchanged (it relies on `navigation` "Sections", the link "Queue", the History tab link, the Verified history button, the sheet `dialog` with heading "Checks", "This machine" and the setup headings and buttons). Run it.
- New `web/e2e/captures.mjs`: the 19 states × 3 widths × 2 themes from "Evidence and limits", with reduced motion, writing `docs/redesign/after/`, plus axe (`axe-core` as a dev dependency), overflow, 44px and focus checks; reuse `layout.mjs`'s static server and mock API, adding WebSocket proxying.
- `scripts/take-screenshots.mjs`: retake `docs/screenshots/*.png` after the redesign (it already uses `colorScheme: "dark"`); update README alt text that mentions "the big savings number" only if the wording no longer fits.
- `docs/ARCHITECTURE.md` › Web UI: rewrite the Navigation paragraph (sidebar with Overview, Libraries, Queue, Settings and the library list; compact top block at 800px; no tab bar; no appearance switch) and the Typography paragraph (system sans; monospace for commands, logs and encoder names); add `popcorn_sr_url`.
- `web/README.md`: remove the self-hosted fonts note.
- `CHANGELOG.md` › Unreleased: Changed (the Popcorn family design, system-only theme, navigation), Added (Popcorn SR link), Removed (the theme switch, bundled fonts).

### 12. Verification checklist

Run on the redesign branch; record results and paths here. Results below are from the design-review fixes on 2026-10-13 (on top of `72ddec4`), measured on the mock API (`web/scripts/mock-api.mjs`, demo, fresh and empty scenarios) with Playwright Chromium and axe-core 4.11.2, unless a line says otherwise.

- [ ] `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`. Not re-run: the review fixes change no Rust (the release binary was built only to retake the screenshots).
- [x] In `web/`: `pnpm lint` (clean), `pnpm typecheck` (clean), `pnpm test` (39 files, 460 tests; 34 files and 427 tests before the fixes), `pnpm build`, `pnpm e2e:layout` (now 8 viewports: 390, 320, 768, 800, 1024, 1280, 1440 and touch 390; all pass). The new checks fail on the build from before the fixes: options and the rescan select cut short at 1024 and 1280, and the tab title "Popcorn Batch" after a fresh load or reload of `#/queue` and `#/libraries`.
- [ ] `make docker`, `make test-docker`, `make e2e`, `make e2e-browser`. Not possible here: no Docker daemon in this environment. Instead `web/e2e/smoke.mjs` ran against the release binary with `scripts/make-test-media.sh` media (8s clips) at `/media` and a fresh data folder: all steps passed (first run, a live conversion on the overview, 3 converted, 3 skipped, 2 failed, the verified job's checks, renamed files in History, Settings › Hardware).
- [ ] Playwright captures of the 19 states at 390×844, 768×1024 and 1440×900, light and dark, `reducedMotion: "reduce"`, saved to `docs/redesign/after/<state>-<width>-<theme>.png`, compared side by side with `before/`. The review's 44 states were captured at 390, 768, 1024 and 1440, light and dark, in the session's scratch space (not committed).
- [x] axe-core (WCAG 2.0, 2.1, 2.2 A and AA tags) on 44 states (setup, overview, libraries, a library's files, sheets and settings, add library, queue, every Settings section, the boot, unreachable, unknown-address and not-found frames, a toast) at 390, 768, 1024 and 1440, light and dark (352 audits): zero violations. Before the fixes: `aria-prohibited-attr` on the boot frame at 390 and 768.
- [x] Every visible button, button-link, input, select, summary, tab, filter, segmented option, folder row and menu item is at least 44px tall at all four widths without a touch pointer; inline links inside a sentence are the only exception ("6 to review" is now 27.5px tall, was 15px; "Overview" inside a Settings message). Toasts have no 20px close button any more.
- [x] No horizontal overflow (`scrollWidth <= innerWidth`) on any of the 352 audits, nor in `e2e:layout` at 320.
- [x] Visible focus: no focus stop without an outline and none clipped (before: "6 to review" and "3 to review" clipped by 6px on the Overview and Libraries at every width). Toasts get the 2px Action Blue outline 4px away (sonner's styles removed it).
- [x] With reduced motion, `document.getAnimations()` returns only spinners (the running job sheet's).
- [x] No element has a computed `box-shadow` other than `none` (before: the toast).
- [x] Light and dark follow the system; the dark save bar's edge is the field border colour (Zinc Status) instead of the 1.19:1 divider.
- [x] The Popcorn SR link: no request to the address in any audit.
- [ ] Owner approved the icon before it ships.

Design review, settings at laptop widths (P1). The narrowest column of controls (px) and what was cut short, before → after, on Processing, Output and Advanced ("settings") and a library's Settings tab ("library"):

| Width | Settings before | Settings after | Library before | Library after |
| --- | --- | --- | --- | --- |
| 801 | 435 (stacked); Standard, Best quality cut | 435; nothing cut | 435; Standard, Best quality cut | 435; nothing cut |
| 900 | 524; nothing cut | 524; nothing cut | 524; nothing cut | 524; nothing cut |
| 1024 | 140 beside the heading; all 8 quality and speed options, "Every 12 hours" (108px in 86px), goal cards 140px, titles on 3 lines | 636 (stacked); nothing cut; cards 312px | 356; Smallest, Standard, Best quality, Slower smaller cut | 636; nothing cut |
| 1100 | 208; all 8 options cut | 672; nothing cut | 424; Standard, Best quality cut | 672; nothing cut |
| 1280 | 370; Smallest, Standard, Best quality, Slower smaller cut | 650 (stacked); nothing cut | 586; nothing cut | 586; nothing cut |
| 1366 | 456; Best quality cut | 672 (stacked); nothing cut | 672; nothing cut | 672; nothing cut |
| 1440 | 530 beside; nothing cut | 530 beside; nothing cut | 746 beside | 672 beside (the 672px column of DESIGN.md) |

Screenshots: `docs/screenshots/*.png` retaken with `scripts/take-screenshots.mjs` against the real release binary (no Docker here): the demo library from `scripts/make-demo-media.sh` bind-mounted at `/media` in a private mount namespace, a fresh data folder, the CPU encoders (no GPU in this environment, so none is shown), the built UI; quantized to 256 colours. The script now moves the pointer off the page before each picture, so no row shows its hover state.

## Next
1. Owner: answer the open questions below and approve or change the icon.
2. The rename task lands first; the redesign rebases on it.
3. Implement in this order, one commit each: foundations (1), primitives (3), shell (2), shared components (4), screens (5.1 to 5.7), the Popcorn SR setting (8, server first), chart (7), icon (9), tests and docs (11).
4. Run section 12, commit `docs/redesign/after/`, retake `docs/screenshots/`, and update this file with the results.
5. Ask Popcorn SR to adopt the field-border assignment and, if wanted, the icon tile system, so the family stays the same.

## Open questions for the owner
1. **Icon**: approve the three-kernel draft, or prefer a shared family glyph (for example Popcorn SR's "p" tile with a product mark)? Popcorn SR's sidebar mark is a text "p" today, and SR has no favicon.
2. **Theme**: confirm that the manual light/dark switch can go (system only, like SR). If you want to keep a manual switch, it should be added to SR in the same release.
3. **Sidebar library list**: keep it (this plan) or match SR exactly and rely on the Libraries screen?
4. **Checks can be switched off**: Settings › Output lets the owner choose Quick checks or none. Keep that choice (with its warning), or remove "Off" so verification cannot be weakened at all, as the family's promise suggests?
5. **CPU fallback from a chosen GPU**: Batch retries a failed GPU encode on the CPU by default, and `HW_ACCEL` pinned to a GPU falls back to the CPU when that GPU can't encode a format; both are visible in the job's tag and attempts. Popcorn SR's rule is "no silent CPU fallback from an explicitly requested GPU job". Is Batch's visible fallback acceptable for the family, or should a pinned GPU fail instead?
6. **Field borders**: Popcorn SR's inputs use the divider colour (about 1.2:1). This plan uses Zinc Status (4.8:1) for WCAG 1.4.11. Should SR change too?
7. **Status text colour**: SR's PRODUCT.md says status "text uses accessible darker counterparts", while its normative DESIGN.md says text stays neutral. This plan follows DESIGN.md (neutral text). Confirm.
8. **"Before" evidence size**: resolved. The captures live in the gitignored `evidence/before/`, as Popcorn SR keeps its evidence.
