"use client";

/**
 * All libraries: one panel of library rows with the bar's legend, as on the
 * Overview. Screens of 800px and below land here from the compact
 * navigation; wider ones also list them in the sidebar.
 */

import { LibrariesPanel } from "@/components/libraries-panel";
import { PageHeader } from "@/components/shell";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { useLibraries } from "@/lib/queries";
import { href } from "@/lib/router";

const PANEL = "overflow-hidden rounded-panel border border-line bg-surface";

export function LibrariesScreen() {
  const libraries = useLibraries();
  const list = libraries.data ?? [];
  const empty = !libraries.isPending && list.length === 0;
  return (
    <div>
      <PageHeader
        title="Libraries"
        description="Each library is a folder Popcorn Batch watches and converts toward its own goal."
        actions={
          // One primary action per view: with no library yet, the empty state's "Choose a folder" is it.
          <a href={href("/libraries/new")} className={buttonVariants({ variant: empty ? "secondary" : "primary" })}>
            Add library
          </a>
        }
      />
      {libraries.isPending ? (
        <ul aria-hidden className={`${PANEL} divide-y divide-line`}>
          {[0, 1].map((i) => (
            <li key={i} className="flex h-[88px] flex-col justify-center gap-2 px-6 max-roomy:px-[18px]">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
              <Skeleton className="h-[5px] w-full rounded-progress" />
            </li>
          ))}
        </ul>
      ) : list.length === 0 ? (
        <div className={PANEL}>
          <EmptyState
            title="No libraries yet"
            action={
              <a href={href("/libraries/new")} className={buttonVariants({ variant: "primary" })}>
                Choose a folder
              </a>
            }
          >
            Add the folder that holds your movies or shows. Popcorn Batch scans it and converts what&apos;s worth
            converting.
          </EmptyState>
        </div>
      ) : (
        // The same panel as the Overview's, with the legend that names the bar's parts.
        <LibrariesPanel libraries={list} />
      )}
    </div>
  );
}
