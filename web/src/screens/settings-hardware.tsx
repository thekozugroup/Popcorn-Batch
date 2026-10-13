"use client";

/**
 * Settings › Hardware, one panel like every settings page: This machine,
 * shaped like Popcorn SR's worker panel (when it was checked, one sentence
 * about what does the converting, the processor, memory and graphics as
 * detail rows, and a tag for each format whose test encode passed), then
 * the setup tips and the preference for which to use as setting groups,
 * and, closed, the encoder table and ffmpeg details.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleDashed, CircleMinus, CircleX } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { SetupHints } from "@/components/hints";
import { SETTINGS_PANEL, SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Field, Select, SwitchRow } from "@/components/ui/controls";
import { Callout, CodeBlock, Disclosure, Skeleton, Tag } from "@/components/ui/display";
import { ApiError, api, errorMessage } from "@/lib/api";
import { ffmpegVersionLabel, formatBytes, formatRelative } from "@/lib/format";
import { encoderCell, isDetecting, machineSummary, matrixApis, preferenceChoices } from "@/lib/hardware";
import {
  GPU_VENDOR_LABEL,
  HW_API_LABEL,
  HW_API_TECH,
  HW_PREFERENCE_API,
  HW_PREFERENCE_LABEL,
  VIDEO_CODEC_LABEL,
} from "@/lib/labels";
import { keys, useHardware } from "@/lib/queries";
import type { EncoderStatus, HardwareInfo, HwApi, HwPreference, Settings, VideoCodec } from "@/lib/types";
import { VIDEO_CODECS } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One fact about the machine: the label on the left, the value (and more about it below) on the right. */
function DetailRow({ label, value, extra }: { label: string; value: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-t border-line pt-4 text-meta text-muted">
      <dt>{label}</dt>
      <dd className="min-w-0 text-right">
        <span className="block text-sm font-label break-words text-ink">{value}</span>
        {extra ? <span className="mt-0.5 block break-words">{extra}</span> : null}
      </dd>
    </div>
  );
}

function Devices({ hw }: { hw: HardwareInfo }) {
  const cores = hw.cpu.cgroup_limit
    ? `${hw.cpu.cgroup_limit.toLocaleString(undefined, { maximumFractionDigits: 1 })} of ${hw.cpu.logical_cores} cores allowed by the container`
    : `${hw.cpu.logical_cores} cores${hw.cpu.physical_cores ? ` (${hw.cpu.physical_cores} physical)` : ""}`;
  const memoryLimit = hw.memory.cgroup_limit_bytes;
  return (
    <dl className="mt-5 flex flex-col gap-4">
      <DetailRow label="Processor" value={hw.cpu.model} extra={cores} />
      <DetailRow
        label="Memory"
        value={formatBytes(memoryLimit ?? hw.memory.total_bytes)}
        extra={
          memoryLimit
            ? `Container limit · ${formatBytes(hw.memory.total_bytes)} in the machine`
            : `${formatBytes(hw.memory.available_bytes)} free`
        }
      />
      {hw.gpus.length ? (
        hw.gpus.map((gpu) => (
          <DetailRow
            key={`${gpu.name}-${gpu.render_node ?? ""}`}
            label={`${GPU_VENDOR_LABEL[gpu.vendor]} graphics`}
            value={gpu.name}
            extra={[gpu.driver, gpu.render_node].filter(Boolean).join(" · ") || "No render node"}
          />
        ))
      ) : (
        <DetailRow label="Graphics" value="None found" />
      )}
    </dl>
  );
}

/** "HEVC (H.265)" → "HEVC", for a tag. */
function codecName(codec: VideoCodec): string {
  return VIDEO_CODEC_LABEL[codec].replace(/ \(.*\)/, "");
}

/**
 * One descriptive tag per format whose test encode passed on this machine,
 * with what encodes it: "HEVC · NVIDIA GPU", "H.264 · NVIDIA GPU", then the
 * formats only the CPU encodes, "AV1 · CPU". Built only from encoders whose
 * cell is "works": a device name alone never earns a tag.
 */
export function formatTags(hw: HardwareInfo): string[] {
  const works = hw.encoders.filter((e) => encoderCell(hw, e) === "works");
  const tags: string[] = [];
  const onGpu = new Set<VideoCodec>();
  const apis = [...new Set(works.filter((e) => e.api !== "software").map((e) => e.api))];
  for (const api of apis) {
    for (const codec of VIDEO_CODECS) {
      if (works.some((e) => e.api === api && e.codec === codec)) {
        tags.push(`${codecName(codec)} · ${HW_API_LABEL[api]}`);
        onGpu.add(codec);
      }
    }
  }
  for (const codec of VIDEO_CODECS) {
    if (!onGpu.has(codec) && works.some((e) => e.api === "software" && e.codec === codec)) {
      tags.push(`${codecName(codec)} · ${HW_API_LABEL.software}`);
    }
  }
  return tags;
}

function cellFor(encoders: EncoderStatus[], codec: string, api: HwApi) {
  return encoders.find((e) => e.codec === codec && e.api === api);
}

/** A closed list of encoders with ffmpeg's reason for each. */
function EncoderReasons({ title, encoders }: { title: string; encoders: EncoderStatus[] }) {
  if (!encoders.length) return null;
  return (
    <Disclosure title={title} className="mt-2">
      <ul className="divide-y divide-line border-t border-line">
        {encoders.map((e) => (
          <li key={e.name} className="py-3">
            <p className="font-mono text-meta text-ink">{e.name}</p>
            <p className="mt-1 text-meta leading-relaxed break-words whitespace-pre-wrap text-muted">{e.error}</p>
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}

/** A cell of the encoder table: a 16px status icon and the word. */
function Cell({ cell }: { cell: ReturnType<typeof encoderCell> }) {
  const [icon, word, strong] =
    cell === "works"
      ? [<CircleCheck key="i" className="size-4 shrink-0 text-ok" aria-hidden />, "Works", true]
      : cell === "failed"
        ? [<CircleX key="i" className="size-4 shrink-0 text-error" aria-hidden />, "Failed test", true]
        : cell === "not_set_up"
          ? [<CircleDashed key="i" className="size-4 shrink-0 text-field" aria-hidden />, "Not set up", false]
          : cell === "unsupported"
            ? [<CircleMinus key="i" className="size-4 shrink-0 text-field" aria-hidden />, "Not supported", false]
            : [<CircleMinus key="i" className="size-4 shrink-0 text-field" aria-hidden />, "Not available", false];
  return (
    <span className={cn("inline-flex items-center gap-1.5", strong ? "text-ink" : "text-muted")}>
      {icon}
      <span>{word}</span>
    </span>
  );
}

function EncoderMatrix({ hw }: { hw: HardwareInfo }) {
  // Only devices that are actually here get a column: ffmpeg lists NVENC,
  // QSV and VA-API encoders even on a machine without those GPUs.
  const apis: HwApi[] = ["software", ...matrixApis(hw)];
  const shown = hw.encoders.filter((e) => apis.includes(e.api));
  const failures = shown.filter((e) => e.error && encoderCell(hw, e) === "failed");
  const unsupported = shown.filter((e) => e.error && encoderCell(hw, e) === "unsupported");
  const notSetUp = shown.some((e) => encoderCell(hw, e) === "not_set_up");
  return (
    <div>
      {/* Scrolls sideways on its own when the columns don't fit, so it can be reached by keyboard. */}
      <div
        tabIndex={0}
        role="region"
        aria-labelledby="encoder-table-heading"
        className="overflow-x-auto rounded-control border border-line bg-surface -outline-offset-2"
      >
        <table className={cn("w-full text-sm", apis.length > 2 && "min-w-[32rem]")}>
          <caption className="sr-only">Which video formats each device can encode</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="py-3 pr-3 pl-5 font-medium">
                Format
              </th>
              {apis.map((api) => (
                <th key={api} scope="col" className="px-3 py-3 font-medium">
                  {HW_API_LABEL[api]}
                  {api !== "software" ? <span className="ml-1 font-mono text-meta">{HW_API_TECH[api]}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {VIDEO_CODECS.map((codec) => (
              <tr key={codec}>
                <th scope="row" className="py-3 pr-3 pl-5 text-left text-sm font-label text-ink">
                  {VIDEO_CODEC_LABEL[codec]}
                </th>
                {apis.map((api) => {
                  const e = cellFor(hw.encoders, codec, api);
                  const cell = encoderCell(hw, e);
                  return (
                    <td key={api} className="px-3 py-3 text-meta whitespace-nowrap">
                      <Cell cell={cell} />
                      {e && cell !== "unavailable" ? (
                        <span className="mt-0.5 block font-mono text-meta text-muted">{e.name}</span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-meta leading-relaxed text-muted">
        Hardware encoders are listed as working only after a short test encode succeeds on this machine.
        {notSetUp ? " “Not set up” means the device isn't passed to the container; the setup tips above show how." : ""}
      </p>
      <EncoderReasons
        title={`Why ${failures.length === 1 ? "1 encoder" : `${failures.length} encoders`} failed the test`}
        encoders={failures}
      />
      <EncoderReasons
        title={`Why ${unsupported.length === 1 ? "1 format isn't" : `${unsupported.length} formats aren't`} supported by the GPU`}
        encoders={unsupported}
      />
    </div>
  );
}

export function HardwareSection({
  draft,
  onChange,
}: {
  draft: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const client = useQueryClient();
  const hardware = useHardware();
  // The server's "Checking your hardware…" stand-in is not a result.
  const detectingFirst = isDetecting(hardware.data);
  const hw = detectingFirst ? undefined : hardware.data;
  const detect = useMutation({
    mutationFn: () => api.detectHardware(),
    onSuccess: (info) => {
      client.setQueryData(keys.hardware, info);
      void client.invalidateQueries({ queryKey: keys.queue });
      toast.success("Hardware checked", { description: info.recommended_jobs.reason });
    },
    onError: (err) => toast.error("Couldn't check the hardware", { description: errorMessage(err) }),
  });
  const detecting = detect.isPending;
  const stillStarting =
    detectingFirst || (hardware.error instanceof ApiError && hardware.error.status === 503);
  const tags = hw && hw.ffmpeg.found ? formatTags(hw) : [];

  // One panel, like every settings page: This machine, then the setup tips and the preferences
  // as setting groups under dividers, then the encoder details.
  return (
    <div className={SETTINGS_PANEL}>
      <section aria-labelledby="this-machine-heading" className="pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h2 id="this-machine-heading" className="text-title text-ink">
              This machine
            </h2>
            {hw ? (
              <p className="mt-1 text-meta text-muted">
                {`Checked ${formatRelative(hw.detected_at)}${hw.in_container ? " · running in a container" : ""}.`}
              </p>
            ) : null}
          </div>
          <Button variant="secondary" size="sm" onClick={() => detect.mutate()} loading={detecting}>
            {detecting ? "Checking…" : "Check again"}
          </Button>
        </div>
        {detecting ? (
          <p role="status" className="mt-4 text-meta text-muted">
            Testing each encoder with a short encode. This takes up to 15 seconds.
          </p>
        ) : null}
        {hw ? (
          <div className={cn("mt-5", detecting && "opacity-60")}>
            <p className="text-base leading-relaxed text-ink">{machineSummary(hw, draft.hardware)}</p>
            <Devices hw={hw} />
            {tags.length ? (
              <ul aria-label="Formats that passed their test encode" className="mt-5 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li key={tag}>
                    <Tag>{tag}</Tag>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : hardware.error && !stillStarting ? (
          <Callout tone="danger" title="Hardware information isn't available" className="mt-5">
            {errorMessage(hardware.error)}
          </Callout>
        ) : (
          <div role="status" aria-label="Checking your hardware" className="mt-5">
            <p className="text-meta text-muted">Checking your hardware… this takes a few seconds.</p>
            <div className="mt-5 flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex justify-between gap-5 border-t border-line pt-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-48 max-w-[50%]" />
                </div>
              ))}
            </div>
          </div>
        )}
        {hw && !hw.ffmpeg.found ? (
          <Callout tone="danger" title="ffmpeg wasn't found" className="mt-5">
            <p>Nothing can be converted until ffmpeg is available. The official image includes it.</p>
            <CodeBlock className="mt-3" code={`FFMPEG_PATH=${hw.ffmpeg.ffmpeg_path}`} label="Path Popcorn Batch tried" />
          </Callout>
        ) : null}
      </section>

      {hw && hw.hints.length ? (
        <SettingsSection title="Setup tips" description="Plain-language fixes for anything that's slowing things down.">
          <SetupHints hints={hw.hints} />
        </SettingsSection>
      ) : null}

      <SettingsSection title="Preferences">
        <Field
          label="Use for converting"
          description={
            draft.hardware === "auto"
              ? "Uses the fastest encoder that passed its test, and the CPU when none did."
              : draft.hardware === "cpu"
                ? "Always uses the CPU, even when a GPU could do it faster."
                : "Only uses this hardware. Formats it can't encode fall back to the CPU if allowed below."
          }
        >
          <Select value={draft.hardware} onChange={(e) => onChange({ hardware: e.target.value as HwPreference })}>
            {preferenceChoices(hw, draft.hardware, HW_PREFERENCE_API).map((choice) => (
              <option key={choice.value} value={choice.value} disabled={choice.disabled}>
                {HW_PREFERENCE_LABEL[choice.value]}
                {choice.disabled ? " (not working on this machine)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        {/* Only matters with a GPU; on a CPU-only machine it would do nothing. */}
        {!hw || matrixApis(hw).length > 0 ? (
          <SwitchRow
            label="If the GPU fails, try the CPU"
            description="A file that the GPU can't convert is retried on the CPU instead of being marked failed."
            checked={draft.cpu_fallback}
            onCheckedChange={(cpu_fallback) => onChange({ cpu_fallback })}
          />
        ) : null}
      </SettingsSection>

      {hw ? (
        // The last group's bottom padding is the gap above this one's divider.
        <Disclosure title="Details: encoders and ffmpeg" className="mt-0">
          <section aria-labelledby="encoder-table-heading">
            <h3 id="encoder-table-heading" className="mb-3 text-sm font-label text-ink">
              What can encode what
            </h3>
            <EncoderMatrix hw={hw} />
          </section>
          {hw.ffmpeg.found ? (
            <section aria-labelledby="ffmpeg-heading" className="flex flex-col gap-1.5">
              <h3 id="ffmpeg-heading" className="text-sm font-label text-ink">
                ffmpeg
              </h3>
              <p className="text-sm text-ink">{ffmpegVersionLabel(hw.ffmpeg.version)}</p>
              <p className="font-mono text-meta break-all text-muted">
                {hw.ffmpeg.ffmpeg_path} · {hw.ffmpeg.ffprobe_path}
                {hw.ffmpeg.ffprobe_found ? "" : " (ffprobe not found)"}
              </p>
              {hw.filters.length ? (
                <p className="text-meta text-muted">
                  Filters used for checks: <span className="font-mono text-meta">{hw.filters.join(", ")}</span>
                </p>
              ) : null}
            </section>
          ) : null}
        </Disclosure>
      ) : null}
    </div>
  );
}
