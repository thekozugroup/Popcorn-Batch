/**
 * The Settings layout pieces shared by every section (DESIGN.md, Settings
 * sections): one padded panel per section page, holding setting groups.
 */

import type { ReactNode } from "react";
import type { SettingFocus } from "@/lib/outcomes";

/** One padded panel per section page (28px, 20px at 520px and below). */
export const SETTINGS_PANEL = "rounded-panel border border-line bg-surface p-7 max-roomy:p-5";

/**
 * A setting group: from 1024px a 240px column with the heading and its
 * explanation beside the controls (up to 672px); below, the heading above
 * them. Groups are separated by a divider.
 */
export function Block({
  title,
  description,
  children,
  anchor,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** The setting a link can bring into view (`?focus=`, see `SetupFix.setting`). */
  anchor?: SettingFocus;
}) {
  return (
    <section
      id={anchor ? `setting-${anchor}` : undefined}
      tabIndex={anchor ? -1 : undefined}
      className="grid scroll-mt-20 gap-4 border-t border-line py-6 outline-none first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10"
    >
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-2 max-w-[68ch] text-sm leading-[1.7] text-muted">{description}</p> : null}
      </div>
      <div className="flex min-w-0 max-w-2xl flex-col gap-5">{children}</div>
    </section>
  );
}
