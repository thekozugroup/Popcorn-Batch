/**
 * The layout of a settings page (DESIGN.md, Settings sections), shared by
 * Settings and a library's Settings tab: one padded panel per page, holding
 * setting groups (`SettingsSection`) separated by dividers.
 *
 * The panel is a size container, and a group lays its heading beside its
 * controls only once the panel's content is 48rem (768px) wide: what decides
 * is the room the panel has, not the screen, which beside the sidebar and
 * the settings navigation leaves a laptop less room than a tablet. The
 * controls column is a container too, so the controls inside it (stacked
 * options, field grids, goal cards) follow its width.
 */

import type { ReactNode } from "react";
import type { SettingFocus } from "@/lib/outcomes";

/** One padded panel per settings page (28px, 20px at 520px and below), and the size container of its groups. */
export const SETTINGS_PANEL = "@container rounded-panel border border-line bg-surface p-7 max-roomy:p-5";

/**
 * A setting group: once the panel has room, a 240px column with the heading
 * and its explanation beside the controls (up to 672px); before that, the
 * heading above them. A divider separates it from the group before; the
 * first in its parent has none and the last no bottom padding, so the
 * panel's own padding frames them. The controls stack with the form gap.
 */
export function SettingsSection({
  title,
  description,
  children,
  level = 2,
  anchor,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Heading level, to fit the page's outline (3 inside "Defaults for new libraries"). */
  level?: 2 | 3;
  /** The setting a link can bring into view (`?focus=`, see `SetupFix.setting`). */
  anchor?: SettingFocus;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section
      id={anchor ? `setting-${anchor}` : undefined}
      tabIndex={anchor ? -1 : undefined}
      className="grid scroll-mt-20 gap-4 border-t border-line py-6 outline-none first:border-t-0 first:pt-0 last:pb-0 @3xl:grid-cols-[15rem_minmax(0,1fr)] @3xl:gap-10"
    >
      <div>
        <Heading className="text-base font-semibold text-ink">{title}</Heading>
        {description ? <p className="mt-2 max-w-[68ch] text-sm leading-[1.7] text-muted">{description}</p> : null}
      </div>
      <div data-settings-controls="" className="@container flex min-w-0 max-w-2xl flex-col gap-5">
        {children}
      </div>
    </section>
  );
}
