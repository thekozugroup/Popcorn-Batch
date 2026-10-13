"use client";

/**
 * First-run setup: welcome → folder → goal → start. Three short steps, each
 * skippable, ending with a library that is already scanning.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/display";
import { api, errorMessage } from "@/lib/api";
import { hasAnyHardware } from "@/lib/hardware";
import { keys, useHardwareInfo } from "@/lib/queries";
import { navigate } from "@/lib/router";
import type { HardwareInfo, Settings } from "@/lib/types";
import { FolderStep, GoalStep, StepHeading } from "./library-steps";

type Step = "welcome" | "folder" | "goal";
const STEPS: Step[] = ["welcome", "folder", "goal"];

/**
 * Where the user is in setup: "Step 1 of 3", as plain text on the right of
 * the header (the step headings repeat it for screen readers).
 */
function StepIndicator({ step }: { step: Step }) {
  return (
    <p className="text-[13px] text-muted tabular">
      Step {STEPS.indexOf(step) + 1} of {STEPS.length}
    </p>
  );
}

/** What this machine brings, in one line (the welcome, and an empty overview). */
export function HardwareLine({ hw, detecting }: { hw: HardwareInfo | undefined; detecting: boolean }): ReactNode {
  if (detecting) return "Checking your hardware… this takes a few seconds.";
  if (!hw) return <Skeleton className="mt-1 h-3.5 w-56" />;
  if (!hw.ffmpeg.found) return "ffmpeg wasn't found in the container, so nothing can be converted yet.";
  const gpu = hw.gpus[0];
  if (hasAnyHardware(hw) && gpu) return `Found ${gpu.name}. It will do most of the work.`;
  if (gpu) return `Found ${gpu.name}, but it can't encode video here yet. Settings › Hardware explains how to fix that.`;
  return `No GPU found. Your ${hw.cpu.logical_cores}-core CPU will do the work, which is slower but just as good.`;
}

/**
 * One of the three reassurances on the welcome step, as Popcorn SR lays out
 * its onboarding: a divider above, a title and a sentence, no icon.
 */
function Fact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="min-w-0 border-t border-line pt-5">
      <p className="text-base font-semibold text-ink">{title}</p>
      <div className="mt-2 text-sm leading-[1.6] text-muted">{children}</div>
    </li>
  );
}

export function SetupScreen({ settings }: { settings: Settings }) {
  const client = useQueryClient();
  const hardware = useHardwareInfo();
  const [step, setStep] = useState<Step>("welcome");
  // Focus follows each step change, but not the page load itself.
  const [moved, setMoved] = useState(false);
  const goTo = (next: Step) => {
    setMoved(true);
    setStep(next);
  };
  const stepLabel = (s: Step) => `Step ${STEPS.indexOf(s) + 1} of ${STEPS.length}`;
  const [path, setPath] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);

  const finishOnboarding = async () => {
    const next = await api.updateSettings({ onboarded: true });
    client.setQueryData(keys.settings, next);
  };

  const skip = useMutation({
    mutationFn: finishOnboarding,
    onError: (err) => toast.error("Couldn't skip setup", { description: errorMessage(err) }),
  });

  return (
    // Padded like the app's main region: 24px 20px 48px up to 800px, then clamp(24px, 5vw, 64px).
    <div className="min-h-dvh bg-page px-5 pt-6 pb-12 wide:p-[clamp(24px,5vw,64px)]">
      <div className="mx-auto flex w-full max-w-3xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <Brand />
          <StepIndicator step={step} />
        </header>

        <main id="main" className="mt-6 wide:mt-10">
          {step === "welcome" ? (
            <div className="view">
              <StepHeading level={1} focusOnMount={moved}>
                Make your video library smaller, safely.
              </StepHeading>
              <p className="mt-2.5 max-w-[58ch] text-base leading-[1.6] text-muted">
                Point Popcorn Batch at a folder and choose a goal. It converts files in the background, checks each
                result against the original, and only then replaces it.
              </p>
              <ul className="mt-8 grid gap-4 wide:grid-cols-3 wide:gap-6">
                <Fact title="Nothing is replaced until it passes its checks">
                  Every new file is played through and compared with the original to catch corruption and visual
                  glitches{settings.output_mode === "folder" ? ". Your originals stay untouched." : "."}
                </Fact>
                <Fact title="Uses your hardware automatically">
                  <HardwareLine hw={hardware.hw} detecting={hardware.detecting} />
                </Fact>
                <Fact title="About a minute to set up">Everything can be changed later in Settings.</Fact>
              </ul>
              {/* Primary first in the DOM (and tab order); shown on the right from 521px. */}
              <div className="mt-10 flex flex-col gap-3 roomy:flex-row-reverse roomy:items-center roomy:justify-between">
                <Button variant="primary" onClick={() => goTo("folder")}>
                  Choose a folder
                </Button>
                {/* Beside the primary, pulled left so its words line up with the page's edge. */}
                <Button variant="quiet" onClick={() => skip.mutate()} loading={skip.isPending} className="roomy:-ml-2.5">
                  Skip for now
                </Button>
              </div>
            </div>
          ) : null}

          {step === "folder" ? (
            <div className="view">
              <FolderStep
                level={1}
                step={stepLabel("folder")}
                initialPath={path ?? undefined}
                error={folderError}
                onNavigate={() => setFolderError(null)}
                onPicked={(picked) => {
                  setPath(picked);
                  setFolderError(null);
                  goTo("goal");
                }}
              />
              <div className="mt-6">
                {/* Pulled left so its words line up with the page's edge. */}
                <Button variant="quiet" onClick={() => goTo("welcome")} className="-ml-2.5">
                  Back
                </Button>
              </div>
            </div>
          ) : null}

          {step === "goal" && path ? (
            <GoalStep
              level={1}
              step={stepLabel("goal")}
              path={path}
              submitLabel="Start"
              onChangeFolder={() => goTo("folder")}
              onFolderError={(message) => {
                setFolderError(message);
                goTo("folder");
              }}
              afterCreate={finishOnboarding}
              onCreated={() => {
                // No toast: the overview already says it's looking through the folder.
                navigate("/", { replace: true });
                // The app replaces this screen: start it at the top, with
                // focus on its content rather than lost on the page.
                window.scrollTo({ top: 0 });
                requestAnimationFrame(() => document.getElementById("main")?.focus({ preventScroll: true }));
              }}
              secondary={
                <Button variant="quiet" onClick={() => goTo("folder")} className="roomy:-ml-2.5">
                  Back
                </Button>
              }
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
