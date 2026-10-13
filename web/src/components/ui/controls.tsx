"use client";

/**
 * Form controls. Native elements wherever the platform already does the job
 * (text inputs, selects, radios), so keyboard, screen reader and phone
 * behaviour come for free; only the look is ours. Every control is at least
 * 44px tall.
 */

import { ChevronDown } from "lucide-react";
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./display";

// The border is what shows a field's edge (its fill is the surface), so it
// uses Zinc Status: 3:1 or more against both surfaces (WCAG 1.4.11).
const fieldBase =
  "w-full min-w-0 min-h-11 rounded-control border border-field bg-surface px-3 py-2.5 text-base leading-normal text-ink disabled:cursor-default disabled:opacity-50 aria-invalid:border-error";

/** Single-line text input. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  const field = useField();
  return <input {...field} className={cn(fieldBase, className)} {...props} />;
}

/** Multi-line text input. */
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const field = useField();
  return <textarea {...field} className={cn(fieldBase, "min-h-24 leading-relaxed", className)} {...props} />;
}

/** Native select with our styling. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  const field = useField();
  return (
    <div className={cn("relative min-w-0", className)}>
      <select {...field} className={cn(fieldBase, "cursor-pointer appearance-none pr-10")} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}

interface FieldContextValue {
  id: string;
  descriptionId: string;
  errorId: string;
  hasDescription: boolean;
  hasError: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/** Ids for the control inside a `Field`, for `aria-describedby`. */
export function useField(): {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
} {
  const ctx = useContext(FieldContext);
  if (!ctx) return {};
  const describedBy = [ctx.hasDescription ? ctx.descriptionId : null, ctx.hasError ? ctx.errorId : null]
    .filter(Boolean)
    .join(" ");
  return {
    id: ctx.id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": ctx.hasError || undefined,
  };
}

/**
 * An error line under a control: 13px, weight 550, main text, after a red
 * status dot. The red is the dot only; the words stay neutral.
 */
export function ErrorText({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} role="alert" className={cn("flex items-baseline gap-2 text-meta leading-relaxed font-label text-ink", className)}>
      <StatusDot tone="danger" className="translate-y-[-1px]" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

interface FieldProps {
  label: ReactNode;
  description?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  /** Render the label visually hidden (the control is labelled elsewhere). */
  hideLabel?: boolean;
}

/** Label, control, help text and error message, wired for assistive tech. */
export function Field({ label, description, error, children, className, hideLabel }: FieldProps) {
  const id = useId();
  const value: FieldContextValue = {
    id: `${id}-control`,
    descriptionId: `${id}-description`,
    errorId: `${id}-error`,
    hasDescription: Boolean(description),
    hasError: Boolean(error),
  };
  return (
    <FieldContext.Provider value={value}>
      <div className={cn("grid min-w-0 gap-2", className)}>
        <label htmlFor={value.id} className={cn("text-sm font-label text-ink", hideLabel && "sr-only")}>
          {label}
        </label>
        {children}
        {description ? (
          <p id={value.descriptionId} className="text-meta leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
        {error ? <ErrorText id={value.errorId}>{error}</ErrorText> : null}
      </div>
    </FieldContext.Provider>
  );
}

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** An on/off setting: label and description on the left, toggle on the right. */
export function SwitchRow({ checked, onCheckedChange, label, description, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn("flex min-h-11 items-start justify-between gap-6", className)}>
      <div className="min-w-0 pt-2.5">
        <label id={`${id}-label`} htmlFor={`${id}-switch`} className="text-sm font-label text-ink">
          {label}
        </label>
        {description ? (
          <p id={`${id}-description`} className="mt-1 text-meta leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        id={`${id}-switch`}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-description` : undefined}
      />
    </div>
  );
}

/**
 * The toggle itself: a 40×24 track inside a 44×44 target. Off is the subtle
 * fill with a Zinc Status border and knob; on is Action Blue with a white
 * knob. Use `SwitchRow` for a labelled setting.
 */
export function Switch({
  checked,
  onCheckedChange,
  className,
  ...props
}: Omit<ComponentProps<"button">, "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group grid size-11 shrink-0 place-items-center rounded-control disabled:cursor-default disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "relative flex h-6 w-10 items-center rounded-full border",
          checked ? "border-accent bg-accent" : "border-field bg-subtle",
        )}
      >
        <span
          className={cn(
            "absolute left-[2px] size-[18px] rounded-full motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out",
            checked ? "translate-x-4 bg-white" : "translate-x-0 bg-field",
          )}
        />
      </span>
    </button>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when `label` is an icon. */
  ariaLabel?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  /** Group label for assistive tech (shown by the surrounding `legend`/heading). */
  label: string;
  className?: string;
  disabled?: boolean;
  /**
   * Stack the options while the column holding them (the nearest size
   * container, such as a settings section's controls) is under 32rem
   * (512px): for rows with more choices than fit side by side there. The
   * room the control has decides, not the screen: beside a settings heading
   * a laptop screen leaves it less room than a phone.
   */
  stackOnPhones?: boolean;
}

/**
 * A row of mutually exclusive choices built on native radios, so arrow keys
 * move the selection and screen readers announce "1 of 5". The selected
 * option has the subtle fill and an Action Blue border.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  disabled,
  stackOnPhones,
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "w-full gap-[3px] rounded-control border border-field bg-surface p-[3px]",
        stackOnPhones ? "flex flex-col @lg:inline-flex @lg:flex-row" : "inline-flex",
        disabled && "opacity-50",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative flex min-h-11 min-w-0 cursor-pointer items-center rounded-tag border px-3 py-1.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-solid",
              // Stacked, a zero flex basis would squash each option to its text height.
              stackOnPhones
                ? "flex-none justify-start @lg:flex-1 @lg:justify-center @lg:text-center"
                : "flex-1 justify-center text-center",
              selected
                ? "border-accent bg-subtle font-semibold text-ink"
                : "border-transparent font-medium text-muted hover:text-ink",
              disabled && "cursor-default",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              aria-label={option.ariaLabel}
              // Placed inside the option: a tap at its centre (mobile screen
              // readers activate controls that way) lands on the label.
              className="sr-only top-1/2 left-1/2"
            />
            {/* Wraps rather than being cut short ("F…") when a column is narrow. */}
            <span className="min-w-0 [overflow-wrap:anywhere]">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

interface ChoiceCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  badge?: ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * A large radio option (a goal card): title, one-line explanation, optional
 * detail. The selected card has an Action Blue border and radio. The radio
 * is named by its title alone and described by the rest, so screen readers
 * don't read the whole card on every arrow key. The card's outline follows
 * its own radio's focus only, so a control inside it (the files-at-once
 * stepper, a folder field) shows just its own outline.
 */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  children,
  badge,
  className,
  disabled,
}: ChoiceCardProps) {
  const id = useId();
  const describedBy = [
    badge ? `${id}-badge` : null,
    description ? `${id}-description` : null,
    children ? `${id}-detail` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <label
      className={cn(
        "relative grid min-w-0 cursor-pointer content-start gap-1 rounded-control border bg-surface p-5 text-left has-[>input:focus-visible]:outline-2 has-[>input:focus-visible]:outline-offset-4 has-[>input:focus-visible]:outline-accent has-[>input:focus-visible]:outline-solid",
        checked ? "border-accent" : "border-line hover:border-field",
        disabled && "cursor-default opacity-50",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-labelledby={`${id}-title`}
        aria-describedby={describedBy || undefined}
        // On the drawn radio circle, not the card's rounded corner: a tap at
        // the input's centre (mobile screen readers activate controls that
        // way) must land on the card, or it selects nothing.
        className="sr-only top-7 left-7"
      />
      {/* Wraps, so a tag beside a long title never runs past a narrow card. */}
      <span className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <span className="flex min-w-0 items-center gap-2.5 text-base leading-normal font-semibold text-ink">
          <span
            aria-hidden
            className={cn(
              "size-4 shrink-0 rounded-full bg-surface",
              checked ? "border-[5px] border-accent" : "border border-field",
            )}
          />
          <span id={`${id}-title`} className="min-w-0">
            {title}
          </span>
        </span>
        {badge ? <span id={`${id}-badge`}>{badge}</span> : null}
      </span>
      {description ? (
        <span id={`${id}-description`} className="pl-[26px] text-sm leading-relaxed text-muted">
          {description}
        </span>
      ) : null}
      {children ? (
        <span id={`${id}-detail`} className="min-w-0 pl-[26px]">
          {children}
        </span>
      ) : null}
    </label>
  );
}
