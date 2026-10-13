"use client";

/**
 * Overlays built on Base UI (focus trapping, Escape, portals, scroll lock):
 * a detail sheet flush with the right edge from 801px and up from the
 * bottom below, a confirmation dialog, an action menu and tooltips. All of
 * them are flat: a 1px divider border, and the overlay backdrop behind
 * sheets and dialogs. No shadows, no blur.
 */

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { X } from "lucide-react";
import { useRef, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./button";

/** The backdrop behind sheets and dialogs: the one overlay colour, fading in 160ms. */
const BACKDROP =
  "fixed inset-0 z-40 bg-overlay transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0";

/** A confirmation's box: the dialog token, fading only. */
const CONFIRM_POPUP =
  "fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-line bg-surface p-7 text-ink outline-none transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 max-roomy:p-5";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra content in the header row, right of the title. */
  headerExtra?: ReactNode;
}

/** Detail panel for a job or file: the one overlay used for reading. */
export function Sheet({ open, onOpenChange, title, description, children, footer, headerExtra }: SheetProps) {
  // Focus lands on the title, so screen readers start at the top and no
  // focus ring appears on the close button after a mouse click.
  const titleRef = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup
          initialFocus={titleRef}
          className={cn(
            "fixed z-50 flex flex-col bg-surface text-ink outline-none",
            // A bottom sheet below 801px…
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-panel border-t border-line",
            // …and flush with the right edge from 801px, with a divider on its left.
            "wide:inset-y-0 wide:right-0 wide:left-auto wide:max-h-none wide:w-[min(34rem,100vw)] wide:rounded-none wide:border-t-0 wide:border-l",
            "transition-[transform,opacity] duration-200 ease-out",
            "data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
            "wide:data-[ending-style]:translate-x-2 wide:data-[ending-style]:translate-y-0 wide:data-[starting-style]:translate-x-2 wide:data-[starting-style]:translate-y-0",
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-6 pt-5 pb-4 max-roomy:px-5">
            <div className="min-w-0 flex-1 pt-2.5">
              <Dialog.Title
                ref={titleRef}
                tabIndex={-1}
                className="text-base leading-normal font-semibold break-words text-ink outline-none"
              >
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[13px] leading-[1.5] break-words text-muted">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            {headerExtra}
            <Dialog.Close className={cn(buttonVariants({ variant: "quiet", size: "icon" }), "-mr-2.5")} aria-label="Close">
              <X />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 max-roomy:px-5">{children}</div>
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-roomy:px-5">
              {footer}
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** A centred dialog, used only for the folder picker opened from a settings field. */
export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className={BACKDROP} />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[min(44rem,calc(100dvh-32px))] w-[min(40rem,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-panel border border-line bg-surface text-ink outline-none",
            "transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
            className,
          )}
        >
          <div className="flex items-start gap-3 px-7 pt-6 pb-3 max-roomy:px-5">
            <div className="min-w-0 flex-1 pt-2.5">
              <Dialog.Title className="text-base leading-normal font-semibold [overflow-wrap:anywhere] text-ink">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[13px] leading-[1.6] text-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close className={cn(buttonVariants({ variant: "quiet", size: "icon" }), "-mr-2.5")} aria-label="Close">
              <X />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-5 max-roomy:px-5">{children}</div>
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-7 py-3 max-roomy:px-5">
              {footer}
            </div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /**
   * The action discards work or forgets data. Its exact words say so; the
   * confirm button stays primary (the family has no red button).
   */
  destructive?: boolean;
  loading?: boolean;
  /** Label of the button that backs out; "Cancel" unless that would be ambiguous. */
  cancelLabel?: string;
}

/** "Are you sure?" for actions that can't be undone. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  onConfirm,
  loading,
  cancelLabel = "Cancel",
}: ConfirmProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={BACKDROP} />
        <AlertDialog.Popup className={CONFIRM_POPUP}>
          {/* A long dotted release name has no place to break: let it wrap anywhere, so it never runs past the dialog. */}
          <AlertDialog.Title className="text-base leading-normal font-semibold [overflow-wrap:anywhere] text-ink">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description
            render={<div />}
            className="mt-2 space-y-2 text-sm leading-[1.7] [overflow-wrap:anywhere] text-muted"
          >
            {children}
          </AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 roomy:flex-row roomy:justify-end">
            <AlertDialog.Close className={buttonVariants({ variant: "secondary" })}>{cancelLabel}</AlertDialog.Close>
            <Button variant="primary" onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

interface UnsavedDialogProps {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
  saving?: boolean;
}

/** "Save your changes?" when leaving a form with unsaved edits. */
export function UnsavedChangesDialog({ open, onSave, onDiscard, onStay, saving }: UnsavedDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && onStay()}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={BACKDROP} />
        <AlertDialog.Popup className={CONFIRM_POPUP}>
          <AlertDialog.Title className="text-base leading-normal font-semibold [overflow-wrap:anywhere] text-ink">
            Save your changes?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-[1.7] text-muted">
            You changed some settings on this page but haven&apos;t saved them. If you leave now without saving,
            they&apos;re lost.
          </AlertDialog.Description>
          <div className="mt-6 flex flex-col gap-2 roomy:flex-row-reverse roomy:justify-start">
            <Button variant="primary" onClick={onSave} loading={saving}>
              Save and leave
            </Button>
            <Button variant="secondary" onClick={onDiscard} disabled={saving}>
              Discard changes
            </Button>
            <AlertDialog.Close className={cn(buttonVariants({ variant: "quiet" }), "roomy:mr-auto")}>
              Keep editing
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/**
 * One menu entry: a command (`onSelect`) or a place to go (`href`). A place
 * is a real link, so it opens in a new tab with a middle click, Cmd- or
 * Ctrl-click, or the browser's context menu.
 */
export type MenuAction = {
  label: string;
  icon?: ReactNode;
  /** It discards or forgets something; its words say so (it keeps the main text colour). */
  destructive?: boolean;
  disabled?: boolean;
} & ({ onSelect: () => void; href?: never } | { href: string; onSelect?: never });

interface ActionMenuProps {
  /** The trigger button element; receives menu props via `render`. */
  trigger: ReactElement;
  actions: (MenuAction | "separator")[];
  align?: "start" | "end";
}

/** A small menu of secondary actions ("⋯" buttons). */
export function ActionMenu({ trigger, actions, align = "end" }: ActionMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner side="bottom" align={align} sideOffset={6} className="z-50 outline-none">
          <Menu.Popup className="min-w-52 rounded-control border border-line bg-surface p-1 text-sm text-ink outline-none transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            {actions.map((action, i) => {
              if (action === "separator") {
                return <Menu.Separator key={`sep-${i}`} className="my-1 h-px bg-line" />;
              }
              const className =
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-tag px-3 text-sm text-ink no-underline outline-none select-none data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[highlighted]:bg-subtle [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted";
              return action.href !== undefined ? (
                <Menu.LinkItem key={action.label} href={action.href} closeOnClick className={className}>
                  {action.icon}
                  {action.label}
                </Menu.LinkItem>
              ) : (
                <Menu.Item key={action.label} disabled={action.disabled} onClick={action.onSelect} className={className}>
                  {action.icon}
                  {action.label}
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Tooltip provider; wrap the app once. */
export const TooltipProvider = BaseTooltip.Provider;

/** A short hint on hover or focus. Never the only place information lives. */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactElement }) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={6} className="z-50">
          <BaseTooltip.Popup className="max-w-72 rounded-control border border-line bg-surface px-2.5 py-1.5 text-[13px] leading-snug text-ink transition-opacity duration-150 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
