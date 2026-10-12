---
name: Popcorn Batch
description: A quiet native workspace that converts a whole video library and shows, file by file, what was checked before anything was replaced.
colors:
  accent: "oklch(62.3% 0.214 259.815)"
  white-surface: "#ffffff"
  zinc-paper: "oklch(98.5% 0 none)"
  zinc-subtle: "oklch(96.7% 0.001 286.375)"
  zinc-divider: "oklch(92% 0.004 286.32)"
  zinc-dark-muted: "oklch(70.5% 0.015 286.067)"
  zinc-status: "oklch(55.2% 0.016 285.938)"
  zinc-muted: "oklch(44.2% 0.017 285.786)"
  zinc-dark-divider: "oklch(27.4% 0.006 286.033)"
  zinc-ink: "oklch(21% 0.006 285.885)"
  zinc-black: "oklch(14.1% 0.005 285.823)"
  status-connected: "oklch(69.6% 0.17 162.48)"
  status-warning: "oklch(76.9% 0.188 70.08)"
  status-error: "oklch(63.7% 0.237 25.331)"
  overlay: "oklch(14.1% 0.005 285.823 / 0.45)"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  section:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 550
    lineHeight: 1.5
  action:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4285714286
  navigation:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4285714286
  metadata:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  tag:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
  code:
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  control: "8px"
  panel: "16px"
  tag: "6px"
  progress: "4px"
spacing:
  field-gap: "8px"
  group-gap: "16px"
  form-gap: "20px"
  section-gap: "24px"
  panel-padding: "28px"
  page-gap: "32px"
  major-gap: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.zinc-black}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  button-secondary:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.zinc-muted}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "11px 10px"
  input:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    width: "100%"
  navigation:
    backgroundColor: "transparent"
    textColor: "{colors.zinc-muted}"
    typography: "{typography.navigation}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  navigation-current:
    backgroundColor: "{colors.zinc-subtle}"
    textColor: "{colors.zinc-ink}"
  tag:
    backgroundColor: "{colors.zinc-subtle}"
    textColor: "{colors.zinc-muted}"
    typography: "{typography.tag}"
    rounded: "{rounded.tag}"
    padding: "5px 9px"
  panel:
    backgroundColor: "{colors.white-surface}"
    rounded: "{rounded.panel}"
  panel-padded:
    padding: "{spacing.panel-padding}"
  message:
    backgroundColor: "{colors.zinc-subtle}"
    rounded: "{rounded.control}"
    padding: "14px 18px"
  progress:
    backgroundColor: "{colors.zinc-subtle}"
    rounded: "{rounded.progress}"
    height: "5px"
    width: "100%"
  status-dot:
    backgroundColor: "{colors.status-connected}"
    rounded: "50%"
    width: "7px"
    height: "7px"
  row:
    textColor: "{colors.zinc-ink}"
    typography: "{typography.body}"
    padding: "20px 24px"
  library-row:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.body}"
    padding: "20px 24px"
  file-row:
    textColor: "{colors.zinc-ink}"
    typography: "{typography.label}"
    padding: "12px 24px"
  track-row:
    textColor: "{colors.zinc-ink}"
    typography: "{typography.label}"
    padding: "12px 0"
  job-row:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.body}"
    padding: "20px 24px"
  check-row:
    textColor: "{colors.zinc-ink}"
    typography: "{typography.label}"
    padding: "12px 0"
  attempt-row:
    textColor: "{colors.zinc-ink}"
    typography: "{typography.label}"
    padding: "12px 0"
  goal-card:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "20px"
  folder-row:
    backgroundColor: "transparent"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.label}"
    padding: "10px 24px"
  toolbar:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-muted}"
    typography: "{typography.metadata}"
    padding: "14px 24px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.zinc-muted}"
    typography: "{typography.navigation}"
    padding: "12px 12px"
  tab-current:
    textColor: "{colors.zinc-ink}"
  filter:
    backgroundColor: "transparent"
    textColor: "{colors.zinc-muted}"
    typography: "{typography.navigation}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  filter-current:
    backgroundColor: "{colors.zinc-subtle}"
    textColor: "{colors.zinc-ink}"
  segment:
    backgroundColor: "transparent"
    textColor: "{colors.zinc-muted}"
    typography: "{typography.navigation}"
    rounded: "{rounded.tag}"
    padding: "11px 12px"
  segment-current:
    backgroundColor: "{colors.zinc-subtle}"
    textColor: "{colors.zinc-ink}"
  settings-section:
    textColor: "{colors.zinc-ink}"
    typography: "{typography.body}"
    padding: "24px 0"
  hardware-summary:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-padding}"
  savings-bar:
    backgroundColor: "{colors.accent}"
    rounded: "{rounded.progress}"
  library-bar:
    backgroundColor: "{colors.zinc-subtle}"
    rounded: "{rounded.progress}"
    height: "5px"
    width: "100%"
  sheet:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-ink}"
    width: "min(34rem, 100vw)"
  dialog:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-padding}"
    width: "min(28rem, calc(100vw - 32px))"
  code-block:
    backgroundColor: "{colors.zinc-subtle}"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.code}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  save-bar:
    backgroundColor: "{colors.white-surface}"
    textColor: "{colors.zinc-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.panel}"
    padding: "12px 16px"
---

# Design System: Popcorn Batch

## Overview

**Creative North Star: "Quiet native workspace"** (shared by the Popcorn family).

Make converting a whole video library feel like choosing a folder and a goal. Neutral surfaces, familiar controls and plain language let the library, its progress and the next useful action lead. People can trust the interface because it shows what was checked before a file replaced its original, names the hardware that actually passed a test encode, and never shows a number the server did not report.

Popcorn Batch belongs to the same family as Popcorn SR and uses the same world: flat sections, thin dividers, one restrained action colour, system sans type, and the system's light or dark preference. Popcorn SR's `DESIGN.md` frontmatter is normative for the family. Every colour, type, radius and spacing value above is copied from it unchanged. Popcorn Batch adds only what SR does not have:

- one colour, `overlay`, for the backdrop behind sheets and dialogs;
- one type token, `code`, for commands, logs and encoder identifiers;
- the Batch components (rows, tracks, checks, attempts, goal cards, folder picker, settings sections, hardware summary, savings chart, sheet, dialog, code block, save bar).

Component defaults describe the light theme; the theme table below gives both. Minimum control heights live in the prose because the frontmatter's fixed `height` cannot express a minimum.

This document describes the target of the 0.4.0 redesign. The current implementation (warm surfaces, gold accent, Newsreader) is recorded in `evidence/before/`; `working.md` holds the screen-by-screen plan that moves the code to this system.

**Key Characteristics:**

- Quiet zinc surfaces with blue actions and dark action text.
- System sans only, with a clear task hierarchy and no display face.
- Flat navigation, flat panels, thin separators and no shadows.
- Familiar native controls with a minimum target height of 44px.
- Status in words first; emerald, amber and red only as small indicators.
- System light/dark preference and reduced-motion-aware feedback.

## Colors

The palette is neutral Tailwind zinc with a single Tailwind blue action and focus accent, in the installed theme's OKLCH values.

### Primary

- **Action Blue** (`accent`): primary task buttons, focus outlines, checked checkboxes, radios and switches, the selected goal card and segmented option, job progress, the converted part of a library bar, and the bars of the savings chart. Text on it is Zinc Black in both themes (5.4:1).

### Neutral

- **White Surface** (`white-surface`): light-theme panels, inputs, sidebar, sheets and dialogs.
- **Zinc Paper** (`zinc-paper`): light page canvas and dark-theme main text.
- **Zinc Subtle** (`zinc-subtle`): light current navigation, tags, messages, progress tracks, code blocks and selected filters.
- **Zinc Divider** (`zinc-divider`): light borders and separators.
- **Zinc Muted** (`zinc-muted`): light supporting text.
- **Zinc Ink** (`zinc-ink`): light main text; dark panels, inputs, sidebar, sheets and dialogs.
- **Zinc Black** (`zinc-black`): dark page canvas and text on blue actions.
- **Zinc Dark Divider** (`zinc-dark-divider`): dark borders, current navigation, tags, messages and progress tracks.
- **Zinc Dark Muted** (`zinc-dark-muted`): dark supporting text.
- **Zinc Status** (`zinc-status`): neutral status dot. Popcorn Batch also uses it for the border of form fields and for the skipped part of a library bar (see below).
- **Overlay** (`overlay`, Batch only): the backdrop behind a sheet or dialog, in both themes.

| Semantic assignment in CSS | Light | Dark |
| --- | --- | --- |
| Page | Zinc Paper | Zinc Black |
| Surface | White Surface | Zinc Ink |
| Main text | Zinc Ink | Zinc Paper |
| Supporting text | Zinc Muted | Zinc Dark Muted |
| Border/divider | Zinc Divider | Zinc Dark Divider |
| Subtle fill | Zinc Subtle | Zinc Dark Divider |
| Action fill/focus/progress | Action Blue | Action Blue |
| Action text | Zinc Black | Zinc Black |
| Field border (Batch) | Zinc Status | Zinc Status |
| Skipped segment (Batch) | Zinc Status | Zinc Status |
| Backdrop (Batch) | Overlay | Overlay |

**Field border.** Popcorn SR draws input borders in the divider colour. Popcorn Batch commits to WCAG 2.2 AA, which asks for 3:1 between a field's edge and its surroundings (1.4.11). Zinc Divider gives about 1.2:1; Zinc Status gives 4.8:1 on White Surface and 3.6:1 on Zinc Ink. Inputs, selects, textareas, unchecked radios, the off switch and the segmented control therefore use Zinc Status for their border. This is a different assignment of an existing token, not a new value.

### Status

Connected emerald, warning amber and error red are indicators, not action colours. They appear only as a 7px status dot in a tag, a 16px icon in a check or attempt row, the 1px border of a message, the failed mark of a library bar, and a red field border while a field is invalid. Text next to them uses the ordinary main or supporting text colour. Every status has words.

| What it means in Popcorn Batch | Indicator | Example words |
| --- | --- | --- |
| Passed, finished well, healthy | `status-connected` (emerald) | Verified, Works, Watching for new files, a passed check, a succeeded attempt |
| Working now (progress feedback) | `accent` | Converting, Checking quality, Preparing |
| Waiting, left as it is, or a deliberate choice | `zinc-status` | Waiting, To convert, Skipped, Kept original, Kept as converted, Cancelled, Moved or changed, Paused |
| Needs the user, nothing is lost | `status-warning` (amber) | Needs a fix, Can't be read, Folder missing, a check warning, the "couldn't convert" mark in a library bar |
| Something failed | `status-error` (red) | Failed, a failed check, Failed test, a failed attempt, an invalid field |

**The One Accent Rule.** Use Action Blue for the next processing action, focus, selection and progress feedback; keep navigation, secondary actions, links and status words neutral. Never set text in blue.

## Typography

**Body and heading font:** the platform system sans stack in the frontmatter. No display face is part of the family: Newsreader, DM Sans and JetBrains Mono are removed with their `@fontsource` packages. Monospace (`code`) is confined to literal commands, logs, environment variable lines and encoder identifiers, inside code blocks and inline `<code>`, and to the one field where people type literal patterns (Ignored files). File names, paths, formats ("AV1 · Opus · MKV"), versions and builds are set in sans.

**Character:** restrained, familiar and readable. Sentence-case headings and controls set the hierarchy through size and weight. No uppercase eyebrow, no letter-spaced label and no decorative numeral style is part of the system.

### Hierarchy

| Token | Popcorn Batch uses it for |
| --- | --- |
| Headline (30px, 28px at 520px and below) | The page's one `h1`: Libraries, a library's name, Queue, Settings, each setup and add-library step question, error screens |
| Title (20px) | Section headings on a page: Needs your attention, Converting now, Libraries, Recently finished, Saved per day, This machine |
| Section (16px) | Settings section headings, sheet titles, dialog titles, empty-state titles, goal-card titles |
| Body (16px) | Paragraphs, input and select text, library and job row names (weight 550) |
| Label (14px, 550) | Field labels, sheet sub-headings, file-table cells, track, check and attempt row titles |
| Action (14px, 600) | Buttons and button-links |
| Navigation (14px, 500) | Sidebar items, tabs, filters, segmented options |
| Metadata (13px) | Paths, job details, status lines under a name, hints, field help, check details |
| Tag (12px) | Tags, counts, chart axis labels, the library-bar legend, table headers (weight 500) |
| Code (13px mono) | Commands, logs, `ALLOWED_HOSTS=…`, encoder names such as `hevc_nvenc` |

Supporting paragraphs use relaxed leading (1.6 to 1.7). Page subtitles are limited to 58ch, settings prose to 68ch, empty-state text to 42ch.

The Overview's saved amount ("612 GB saved") is a local composition, not a token: the number and unit at 48px, weight 600, line height 1.1, tracking -0.025em (40px at 520px and below), and the word "saved" at the title size in supporting text. The brand wordmark keeps Popcorn SR's own measurements (19px, weight 650, tracking -0.6px; the product word at 12px, weight 500, tracking 0.02em) and is outside the type ramp.

**The Readable Hierarchy Rule.** Reserve headline and title emphasis for task structure; keep paths, formats, sizes and status in the supporting text hierarchy.

## Layout

The desktop shell pairs a sticky sidebar (228px) with flexible main content, as in Popcorn SR. The main column is centred, bounded (1320px) and padded responsively (`clamp(24px, 5vw, 64px)`). Navigation is the same on every screen: Overview, Libraries, Queue, Settings. Below the four items, a Batch-only list of the user's libraries gives one-step access to each library and its state.

At the compact-navigation breakpoint (maximum 800px) the sidebar becomes a top block that scrolls away with the page: the wordmark and the queue status on one line, then four equal navigation columns (12px text, 10px 2px padding, 44px minimum height). The library list and the sidebar footer are hidden; the Libraries screen lists every library. There is no bottom tab bar. Main padding becomes 24px 20px 48px.

At the stacked-controls breakpoint (maximum 520px) page headers, row actions, field grids and dialog buttons stack; padded panels use 20px; rows use 18px. These are Popcorn SR's breakpoints, not Tailwind's default scale, and they govern the shell and all stacking. Content grids keep their own column breakpoints where the content needs them: goal cards go to two columns at 640px, the settings section navigation becomes a column at 1024px, the Overview's chart moves beside the saved amount at 1024px, and Libraries and Recently finished sit side by side at 1280px.

Pages are a page header (headline, optional subtitle, actions on the right) followed by sections separated by the major gap (40px). A section is a title row and one panel. Rows inside a panel are separated by thin dividers; a panel never holds nested cards.

**Detail sheets.** A job's or file's details open in a sheet from the right at 801px and wider, and from the bottom below, over the current screen. The sheet is part of the URL (`?job=`, `?file=`), so it can be reloaded and linked. It is the one overlay used for reading; everything people do (setup, adding a library, choosing a goal or folder, changing settings, queue actions) happens inline on the page. Dialogs are used only to confirm an action that discards work or forgets data, and for the folder picker opened from a settings field.

**The Inline Work Rule.** Keep setup, goals, folders, settings and queue actions in their own page sections, separated by spacing and dividers; open a sheet only to read one job or file in detail, and a dialog only to confirm.

## Elevation & Depth

No box shadows are defined. Tonal differences, 1px borders, whitespace and the current-navigation fill create separation. Sheets, dialogs, menus, tooltips and toasts are separated from the page by a 1px divider border, and sheets and dialogs also by the `overlay` backdrop. The `shadow-card` and `shadow-pop` utilities, the `--shadow-color` variables, inset rings drawn with `box-shadow`, `backdrop-blur` and translucent bars are removed.

**The Flat By Default Rule.** Use neutral surfaces and thin dividers for structure; do not add decorative elevation, blur or glass to any part of the workspace, including overlays.

## Shapes

Controls, messages, goal cards, menus, tooltips, toasts and code blocks use the control radius (8px). Panels, sheets (their top corners on phones), dialogs and the save bar use the panel radius (16px). Tags and segmented options use the tag radius (6px). Progress tracks, library bars and chart bars use the progress radius (4px). Status dots and the radio indicator are circles; the switch track is the only fully rounded control. There are no pill-shaped buttons, chips or badges.

**The Familiar Controls Rule.** Every button, link styled as a button, navigation item, tab, filter, segmented option, input, select, folder row, menu item and disclosure summary is at least 44px tall at every width and with every pointer; checkbox, radio and switch labels give the same 44px target. Inline text links inside a sentence are the only exception.

## Components

### Buttons

Quiet, direct controls named after their task. Primary buttons pair Action Blue with Zinc Black; secondary buttons use the theme surface and a thin divider border; quiet buttons have no fill and no border. One primary button per view.

Hover uses `brightness(.94)`; press uses `scale(.98)`. Focus is a 2px Action Blue outline with a 4px offset; a full-width row button inside a panel uses a -2px offset so the outline is never clipped. Disabled buttons halve opacity and use the default cursor. A busy button shows a 16px spinner before its label and sets `aria-busy`. Transitions of background and transform (160ms, `ease-out`) run only when reduced motion is not requested.

Sizes keep one height: `sm` narrows the horizontal padding to 12px; icon buttons are 44px squares with a 16px glyph and an `aria-label`. There is no red "danger" button: a destructive action is a secondary button with an exact label ("Remove library", "Clear history", "Stop now") and a confirmation dialog. Text buttons have no leading icon. A `link` style (main text, underlined, offset 3px) exists only for links inside a sentence.

### Tags and status

Tags describe a state; they are never clickable. They use subtle fill, supporting text, tag type and tag radius, with no border and no icon. A status tag starts with a 7px status dot (see the status table); a descriptive tag (Best fit, Recommended, Default, Forced, a goal name, NVIDIA GPU, CPU) has no dot.

### Cards / Containers

Flat panels have the theme surface, a 1px divider border and the panel radius. Padded panels use 28px (20px at 520px and below). Rows (20px 24px; 18px at 520px and below) sit inside panels with a 1px divider between them, place content beside actions, and let long paths wrap. File names in dense lists keep the existing `FileName` behaviour: one line, cut before a late episode number so it stays visible, with the whole name in the tooltip and for screen readers.

### Inputs / Fields

Native inputs, selects and textareas share the control radius, the surface fill, a 1px Zinc Status border, body text and a 44px minimum height. Labels sit above the control with the field gap (8px); help text follows in metadata type with 1.6 leading. An invalid field gets a red border and an error line under it in 13px, weight 550, main text, with `role="alert"`. Checkboxes are native, 18px, with `accent-color` Action Blue, inside a label with a 44px target. Switches: a 40×24 track (off: subtle fill and Zinc Status border with a Zinc Status knob; on: Action Blue with a White Surface knob), inside a 44px target.

### Navigation

Sidebar items are rounded, neutral, text-only buttons (navigation token, 44px). Hover and the current page share the subtle fill and main text; other items use supporting text. The current page has `aria-current="page"`. The Batch library list under the navigation uses the same item style with two lines: the library name (navigation token) and its state (tag type, supporting text), with a status dot only for an amber state such as Folder missing.

Tabs (Queue: Running, Up next, History; a library: Files, Settings) are links with a 2px bottom border: Zinc Ink (light) or Zinc Paper (dark) for the current tab, transparent otherwise. A count follows the label as a tag. Tabs fit at 390px and do not fade at the edges.

Settings sections (Processing, Output, Hardware, Advanced) are a vertical navigation list in a 176px column from 1024px, and a wrapping row of the same navigation items below.

View changes move focus to the main region, and a keyboard skip link reaches it first.

### Messages and Progress

Messages use the subtle fill, the control radius, 14px text with 1.6 leading and wrap anywhere. A message has a title in 14px weight 600 and optional body and action. Its tone is a 1px border only: none for information, emerald for success, amber for warning, red for error; the text stays neutral and there is no icon. Global notices use a polite live region; form errors use alerts.

Progress is a 5px track in the subtle fill with an Action Blue fill and the progress radius; it is never decorative. While a job's share is unknown, a band one third wide moves along the track when motion is allowed and stays still otherwise, and the words beside it ("1,017 frames · 7 min elapsed · how far isn't known yet") carry the state. There is no shimmer, sheen or striped fill.

### Library rows and the library bar

A library row is a link that covers the whole row: the name (body, 550) with the space saved on the right (metadata, main text), a status line (metadata, supporting text, "56 files to go · 6 to review", "60% finished"), and the library bar. The bar is a 5px track: converted files in Action Blue, skipped files in Zinc Status, files that couldn't be converted as an amber mark at the end, and the rest as the empty track. Files in the queue are part of the empty track; they are named in the legend. The legend lists every part in words with its count (tag type), with a 10px square swatch for the drawn parts and an outlined swatch for the empty ones. The bar has `role="img"` and a sentence as its label.

### File rows and track lists

The file list is a table from 801px (checkbox, Name, Size, Format, Status, Saved) and a list of file rows below (checkbox, then name, size and format in metadata, then the status tag). Table headers use tag type, weight 500. A selected row uses the subtle fill. Status filters above the list are toggle buttons (`aria-pressed`) with a count: filter token, 44px, a 1px Zinc Status border on the pressed filter so the state is not shown by fill alone.

A file's tracks are a list of track rows with a top divider and dividers between: a 16px kind icon in supporting text (video, audio, subtitles), the track title (label), its details in full on their own line (metadata: codec, resolution or channels, language), the release's own track title as one shortened line with a tooltip, and Default or Forced as descriptive tags on the right.

### Job rows, verification checks and the attempt history

A running job is a job row (`<article>`, `min-w-0`) inside the Converting now or Running panel: the file name (body, 550, a button that opens the sheet), the library and size (metadata), where it runs as a descriptive tag (NVIDIA GPU, CPU), the stage line, the progress track and its words, and a later attempt's reason as a line in supporting text after an amber dot. Actions sit on the right and are named after the file: Stop (quiet) and Details (secondary). At 520px and below the actions move under the content.

The stage line lists Preparing, Converting, Checking quality, Finishing in metadata type: done stages in supporting text with a 12px check in supporting text, the current stage in main text, weight 600, after a 6px Action Blue dot, and stages not reached after a hollow 6px ring in Zinc Status. Below 521px it is one line: "Checking quality · step 3 of 4".

Verification checks are check rows under the heading Checks: a lead sentence ("Looks the same as the original: 99.6% similar at its lowest point."), then one row per check with a 16px status icon (emerald pass, amber warning, red fail, Zinc Status skipped) followed by a hidden status word, the check (label), its explanation (metadata) and a measured value on the right (tag type), then the check level and time taken (metadata). Rows have no enclosing box: a top divider and dividers between.

The attempt history uses the same row: a 16px icon (emerald check for the attempt that succeeded, red cross for a failed one, an Action Blue spinner for the one running now), the heading "Attempt 2 · NVIDIA GPU · decoded on the CPU · 12 min" (label) and the outcome in metadata. It appears in the sheet whenever there was more than one attempt.

### Goal cards

Goal cards are large radio options in a two-column grid from 640px: the goal card token, a 1px divider border, hover with a Zinc Status border, and the selected card with an Action Blue border and an Action Blue radio. Inside: a 16px radio circle, the title (section), the outcome sentence (14px, supporting text), the formats ("AV1 · Opus · MKV", metadata, sans) and the speed on this machine on the right ("Fast here", metadata, supporting text, with its 14px icon in supporting text; "Can't convert here" adds a red status dot). Best fit is a descriptive tag. The radio is named by the title and described by the rest.

### Folder picker

The folder picker is one panel: a toolbar (Up one folder icon button, the folder path as a breadcrumb of quiet buttons, and Type a path), the "Your folders" row of filter buttons for the mounted folders (pressed while the current folder is inside one), the folder list, an "Other folders" group heading in metadata, the System folders disclosure, any message about the current folder (amber border for a conflict, red for an error), and a footer toolbar with the current folder (metadata in sans, wraps) and the primary "Use “Movies”" button. Folder rows are 44px list items with a 16px folder or drive icon in supporting text, the name (label), the video count on the right (metadata) and a chevron; the highlighted row has the subtle fill. Arrow keys, Enter and Backspace keep working, and the hidden "Current folder:" prefix stays for screen readers.

### Settings sections

Settings live in one padded panel per section page. Each setting group is a settings section: on 1024px and wider, a 240px column with the heading (section type) and its explanation (14px, supporting text, 1.7 leading), and the controls in a column of up to 672px; below, the heading sits above the controls. Groups are separated by a 1px divider. Choice lists (Finished files, Work folder, Checks before replacing) use goal cards in one column. Changes collect in one draft; the save bar appears at the bottom of the viewport while there are unsaved changes.

The save bar is a sticky bar 16px above the bottom of the viewport: the save-bar token, a 1px divider border (red while saving failed), "You have unsaved changes." or the error, then Discard (quiet) and Save changes (primary).

### Queue controls

Pause is a secondary button, Resume a primary button (it is the next processing action while paused), and Stop now a quiet button shown only while files are converting; it asks first in a dialog whose confirm button is primary. The queue's state is a sentence in the page subtitle ("Converting 3 files, up to 3 at once. 29 files up next."), and in the shell as a status link: a 7px dot (Action Blue converting, amber needs a fix, Zinc Status waiting or paused, emerald watching) and the words, leading to the Queue. While the live connection is down, the link shows the last known state with a hollow dot and "Last known: …".

### Hardware summary

The hardware summary is the This machine panel, shaped like Popcorn SR's worker panel: the heading with a Check again secondary button, "Checked 3 h ago · running in a container" (metadata), the summary sentence from the test encodes ("NVIDIA GeForce RTX 3060 converts HEVC and H.264. The rest converts on the CPU.", body), detail rows (Processor, Memory, one row per graphics card: label in metadata supporting text, value in 14px weight 550 main text, extra facts in metadata below), and one descriptive tag per format whose test encode passed ("HEVC · NVIDIA GPU", "AV1 · CPU"). Setup tips are messages. The encoder table stays under the "Details: encoders and ffmpeg" disclosure, with a status icon and a word in each cell.

### Savings chart

Saved per day is the one chart. It shows real daily savings from the server, appears only once at least three days have savings, and sits in a padded panel: the title, the total for the last 30 days (metadata), columns in Action Blue with the progress radius on top, 1px divider grid lines, axis labels in tag type, and a "Show the daily numbers" disclosure holding the same data as a table. Hovering a column shows its day, amount and file count in the caption line and darkens the column with the standard hover filter.

### Sheets, dialogs, menus, tooltips, toasts

Sheets: the sheet token, full height and flush with the right edge from 801px with a 1px divider on the left, a bottom sheet up to 92dvh with panel-radius top corners below. The header holds the title (section), a description (metadata) and a 44px close button; the body scrolls; the footer holds the actions. Focus starts on the title and returns to the opener on close.

Dialogs: the dialog token with a 1px divider border, the title (section, wraps anywhere), the body (14px, supporting text, 1.7) and the actions on the right (Cancel secondary, confirm primary), stacked at 520px and below.

Menus: a popup with the control radius, 1px divider border, 4px padding and 44px items; the highlighted item has the subtle fill. Tooltips: control radius, 1px divider border, 13px text; never the only place information lives. Toasts: control radius, 1px divider border, 14px text, a 1px emerald or red border for success or error, bottom right with a 16px offset.

### Code blocks and bug-report copy

Code blocks use the code-block token with a 1px divider border, a header row with the block's label (tag type, supporting text) and a secondary Copy button, then the text in code type. "Copy for a bug report" is a secondary button; it reads "Copied" for two seconds and announces it politely.

### Popcorn SR link

When the Popcorn SR address is set in Settings, an "Open Popcorn SR" link appears in the sidebar footer (quiet button style) and in About (secondary button style). It opens in a new tab and says so to screen readers. It never shows a connection state: Popcorn Batch does not contact Popcorn SR.

### Motion

When motion is allowed: controls transition background and transform (160ms, `ease-out`); a screen enters with opacity and a 4px vertical shift (200ms, `ease-out`); progress fills move to a new value over 200ms; sheets enter with opacity and an 8px shift (200ms); dialogs, menus and tooltips fade (160ms); skeletons pulse; the unknown-share band moves. With reduced motion all of these stop, except busy spinners, which keep turning slowly so a waiting button never looks stuck.

## Light and dark

Popcorn Batch follows the system light/dark preference only, like Popcorn SR. The manual System / Light / Dark switch is removed, together with the theme boot script, the `dark` class and the stored choice. Reasons:

- The two apps of the family behave the same way, and the tokens can be written exactly like Popcorn SR's `ui.css` (`prefers-color-scheme`, `color-scheme: light dark`).
- "Match system" is already the default, so most people see no change.
- The stored choice lived in one browser only; the system setting follows the person to every browser.
- The sidebar footer and the Settings header lose a control that has nothing to do with the library, and there is one theme state fewer to test.

If a manual switch is wanted later, it is added to both apps in the same release.

## Popcorn Batch rules

**The Checked Before Replaced Rule.** Show a file as converted only with its checks one step away. "Verified" appears only when every check passed; a kept original always says why; nothing in the interface suggests an original was replaced before its checks finished.

**The Real Numbers Rule.** Every number on screen comes from the server. Progress whose share is not known shows frames and time elapsed, never a percentage or a time left; an estimate starts with "About" and says what it is estimated from. Sample or mock data never ships in the bundle.

**The Tested Hardware Rule.** Hardware appears together with what passed its test encode. A device name alone never earns "Works", a format tag or a speed word, and a mock or screenshot is never evidence that a GPU works.

## Do's and Don'ts

### Do:

- **Do** keep actions, focus, selection and progress blue, with dark text on filled blue buttons in both themes.
- **Do** use neutral surfaces, thin dividers and the control/panel/tag/progress radius hierarchy.
- **Do** keep visible focus, native controls, wrapping paths and the 44px minimum target on every control.
- **Do** pair every status indicator with readable words in neutral text.
- **Do** show a finished file's checks and attempts, and the reason whenever an original was kept.
- **Do** follow the system light/dark preference and reduced motion.

### Don't:

- **Don't** turn status colours into action colours, or set any text in blue, emerald, amber or red.
- **Don't** add decorative charts, fake activity, gradients, stripes, glass, blur or shadows.
- **Don't** make ordinary tasks depend on a modal; sheets are for reading one job or file, dialogs for confirming.
- **Don't** imply that an original was replaced before its checks passed, or that checks ran when they were off.
- **Don't** treat screenshots, device names or mocked capabilities as evidence that a GPU works.
- **Don't** reintroduce a display font, uppercase eyebrows, pill-shaped badges or one-off brand measurements as reusable tokens.
