"use client";

/** A folder setting: shows the chosen path and opens the folder picker. */

import { Folder } from "lucide-react";
import { useState } from "react";
import { FolderPicker } from "@/components/folder-picker";
import { Button } from "@/components/ui/button";
import { ErrorText } from "@/components/ui/controls";
import { Modal } from "@/components/ui/overlays";
import { cn } from "@/lib/utils";

interface FolderFieldProps {
  value: string | null;
  onChange: (path: string) => void;
  placeholder: string;
  dialogTitle: string;
  dialogDescription?: string;
  error?: string | null;
  labelId?: string;
}

export function FolderField({
  value,
  onChange,
  placeholder,
  dialogTitle,
  dialogDescription,
  error,
  labelId,
}: FolderFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        className={cn(
          "flex min-h-11 min-w-0 items-center gap-3 rounded-control border bg-surface py-1 pr-1 pl-3",
          error ? "border-error" : "border-field",
        )}
      >
        <Folder className="size-4 shrink-0 text-muted" aria-hidden />
        <span
          className={cn("min-w-0 flex-1 text-base break-words", value ? "text-ink" : "text-muted")}
          aria-labelledby={labelId}
        >
          {value || placeholder}
        </span>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)} aria-describedby={labelId}>
          {value ? "Change…" : "Choose…"}
        </Button>
      </div>
      {error ? <ErrorText className="mt-2">{error}</ErrorText> : null}
      <Modal open={open} onOpenChange={setOpen} title={dialogTitle} description={dialogDescription}>
        {open ? (
          <FolderPicker
            initialPath={value ?? undefined}
            onSelect={(path) => {
              onChange(path);
              setOpen(false);
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
