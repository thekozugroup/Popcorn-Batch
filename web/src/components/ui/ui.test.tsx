import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, buttonVariants } from "./button";
import { ChoiceCard, Field, Input, Segmented, Switch } from "./controls";
import { Callout, CopyButton, Disclosure, EmptyState, Meter, StatusDot, Tag } from "./display";
import { NavTabs, Pager } from "./nav-tabs";
import { ConfirmDialog } from "./overlays";

/**
 * The primitives follow the Popcorn family system (DESIGN.md; working.md §3):
 * 44px targets, Action Blue with dark text as the one accent, status colour
 * only as a dot or a border beside neutral words, flat (no shadows), and the
 * control, panel, tag and progress radii.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/);

describe("Button", () => {
  it("is at least 44px tall at every size, with the control radius and no shadow", () => {
    for (const size of ["sm", "md", "icon"] as const) {
      const c = classes(document.createRange().createContextualFragment(`<b class="${buttonVariants({ size })}"></b>`).firstElementChild);
      expect(c.some((x) => x === "min-h-11" || x === "size-11")).toBe(true);
      expect(c).toContain("rounded-control");
      expect(c.some((x) => x.startsWith("shadow"))).toBe(false);
    }
  });

  it("pairs Action Blue with dark text on the primary button", () => {
    render(<Button variant="primary">Start</Button>);
    const c = classes(screen.getByRole("button", { name: "Start" }));
    expect(c).toEqual(expect.arrayContaining(["bg-accent", "text-accent-ink", "border-accent"]));
  });

  it("keeps one padding per size when used on a link (the merged classes win)", () => {
    const quiet = classes(document.createRange().createContextualFragment(`<a class="${buttonVariants({ variant: "quiet" })}"></a>`).firstElementChild);
    expect(quiet).toContain("px-2.5");
    expect(quiet).not.toContain("px-[17px]");
    const link = classes(document.createRange().createContextualFragment(`<a class="${buttonVariants({ variant: "link" })}"></a>`).firstElementChild);
    expect(link).toContain("min-h-0");
    expect(link).not.toContain("min-h-11");
    expect(link).toContain("underline");
  });

  it("shows a spinner and says it is busy while loading", () => {
    render(<Button loading>Save changes</Button>);
    const button = screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.disabled).toBe(true);
    expect(button.querySelector("svg.spin")).not.toBeNull();
  });
});

describe("Tag", () => {
  it("starts a status tag with a 7px dot in its tone, and a descriptive one with none", () => {
    const { container } = render(
      <>
        <Tag tone="success">Verified</Tag>
        <Tag tone="warning">Needs a fix</Tag>
        <Tag tone="danger">Failed</Tag>
        <Tag tone="accent">Converting</Tag>
        <Tag tone="info">Skipped</Tag>
        <Tag>Best fit</Tag>
      </>,
    );
    const dots = Array.from(container.children).map((tag) => tag.querySelector("span[aria-hidden]")?.className ?? null);
    expect(dots.map((d) => d?.match(/bg-(ok|warn|error|accent|field)/)?.[1] ?? null)).toEqual([
      "ok",
      "warn",
      "error",
      "accent",
      "field",
      null,
    ]);
    // The words stay neutral; the tag has the tag radius, not a pill.
    for (const tag of Array.from(container.children)) {
      expect(classes(tag)).toEqual(expect.arrayContaining(["text-muted", "bg-subtle", "rounded-tag"]));
      expect(classes(tag)).not.toContain("rounded-full");
    }
  });

  it("has no icon: a status tag's only mark is its dot", () => {
    const { container } = render(<Tag tone="success">Verified</Tag>);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent).toBe("Verified");
    expect(container.querySelector("span[aria-hidden]")?.className).toContain("bg-ok");
  });

  it("marks itself, so a filled row can keep it visible (globals.css), and takes a tooltip", () => {
    const { container } = render(<Tag title="Already the library “Movies”">Library</Tag>);
    const tag = container.firstElementChild;
    expect(tag?.hasAttribute("data-tag")).toBe(true);
    expect(tag?.getAttribute("title")).toBe("Already the library “Movies”");
  });
});

describe("Callout (a message)", () => {
  it("shows its tone as a 1px border only, with neutral text and no icon", () => {
    const { container } = render(
      <>
        <Callout title="Note">Information</Callout>
        <Callout tone="success" title="Verified">Done</Callout>
        <Callout tone="warning" title="Needs a fix">Fix</Callout>
        <Callout tone="danger" title="Failed">Broken</Callout>
      </>,
    );
    const borders = Array.from(container.children).map((m) => classes(m).find((c) => /^border-(transparent|ok|warn|error)$/.test(c)));
    expect(borders).toEqual(["border-transparent", "border-ok", "border-warn", "border-error"]);
    for (const m of Array.from(container.children)) {
      expect(classes(m)).toEqual(expect.arrayContaining(["bg-subtle", "text-ink", "rounded-control"]));
      expect(m.querySelector("svg")).toBeNull();
    }
  });

  it("can be just its words, with the role and id a caller needs", () => {
    const { container } = render(
      <Callout tone="warning" role="status" id="why">
        This folder is already the library “Movies”.
      </Callout>,
    );
    const message = screen.getByRole("status");
    expect(message.id).toBe("why");
    expect(classes(message)).toContain("border-warn");
    expect(container.querySelector(".font-semibold")).toBeNull();
    expect(message.textContent).toBe("This folder is already the library “Movies”.");
  });
});

describe("StatusDot", () => {
  it("is a filled 7px dot in its tone, or a hollow Zinc Status ring for a last known state", () => {
    const { container } = render(
      <>
        <StatusDot tone="warning" />
        <StatusDot hollow />
      </>,
    );
    const [filled, hollow] = Array.from(container.children);
    expect(classes(filled)).toEqual(expect.arrayContaining(["size-[7px]", "rounded-full", "bg-warn"]));
    expect(classes(hollow)).toEqual(expect.arrayContaining(["size-[7px]", "rounded-full", "border", "border-field"]));
    expect(classes(hollow).some((c) => c.startsWith("bg-"))).toBe(false);
    expect(hollow.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Meter", () => {
  it("is a 5px progressbar with an Action Blue fill", () => {
    render(<Meter value={40} label="Whole file" />);
    const bar = screen.getByRole("progressbar", { name: "Whole file" });
    expect(bar.getAttribute("aria-valuenow")).toBe("40");
    expect(classes(bar)).toEqual(expect.arrayContaining(["h-[5px]", "rounded-progress", "bg-subtle"]));
    expect(classes(bar.firstElementChild)).toContain("bg-accent");
    expect(bar.innerHTML).not.toMatch(/progress-live|gradient/);
  });

  it("has no value while the share isn't known, and says what it knows in words", () => {
    render(<Meter value={null} label="Whole file" valueText="1,017 frames · 7 min elapsed" />);
    const bar = screen.getByRole("progressbar", { name: "Whole file" });
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar.getAttribute("aria-valuetext")).toBe("1,017 frames · 7 min elapsed");
    expect(bar.querySelector(".meter-indeterminate-band")).not.toBeNull();
  });
});

describe("form controls", () => {
  it("draws fields with a Zinc Status border, 44px tall, and an error as neutral words after a red dot", () => {
    render(
      <Field label="Library name" description="Shown in the sidebar." error="Give the library a name.">
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Library name" });
    expect(classes(input)).toEqual(expect.arrayContaining(["border-field", "min-h-11", "rounded-control", "aria-invalid:border-error"]));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("Give the library a name.");
    expect(classes(alert)).toContain("text-ink");
    expect(alert.querySelector("span[aria-hidden]")?.className).toContain("bg-error");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(alert.id);
  });

  it("gives the switch a 44px target around its track, and turns it on and off", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Switch checked={false} onCheckedChange={onChange} aria-label="Watch folders" />);
    const toggle = screen.getByRole("switch", { name: "Watch folders" });
    expect(classes(toggle)).toContain("size-11");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(toggle.querySelector("span")?.className).toContain("border-field");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<Switch checked onCheckedChange={onChange} aria-label="Watch folders" />);
    expect(toggle.querySelector("span")?.className).toContain("bg-accent");
  });

  it("marks the chosen segment with an Action Blue border, each option 44px tall", () => {
    render(
      <Segmented
        label="Speed"
        value="normal"
        onChange={() => {}}
        options={[
          { value: "fast", label: "Faster" },
          { value: "normal", label: "Normal" },
        ]}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Speed" });
    expect(classes(group)).toContain("border-field");
    const labels = Array.from(group.querySelectorAll("label"));
    for (const l of labels) expect(classes(l)).toContain("min-h-11");
    expect(classes(labels[1])).toContain("border-accent");
    expect(classes(labels[0])).toContain("border-transparent");
    expect((screen.getByRole("radio", { name: "Normal" }) as HTMLInputElement).checked).toBe(true);
  });

  it("wraps a long option instead of cutting it short, and stacks by its column's width, not the screen's", () => {
    render(
      <Segmented
        label="Speed"
        value="normal"
        onChange={() => {}}
        options={[
          { value: "fast", label: "Faster" },
          { value: "slow", label: "Slower, smaller" },
        ]}
        stackOnPhones
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Speed" });
    // Stacked until the nearest size container (a settings column) is 32rem wide.
    expect(classes(group)).toEqual(expect.arrayContaining(["flex-col", "@lg:flex-row"]));
    expect(classes(group).some((c) => c.startsWith("roomy:"))).toBe(false);
    for (const label of Array.from(group.querySelectorAll("label"))) {
      const words = label.querySelector("span");
      expect(classes(words)).not.toContain("truncate");
      expect(words?.className).toContain("[overflow-wrap:anywhere]");
    }
  });

  it("lets a choice card's tag wrap under a long title instead of running past the card", () => {
    render(
      <ChoiceCard name="goal" value="balanced" checked onChange={() => {}} title="Balanced" badge={<Tag>Best fit</Tag>}>
        HEVC · MKV
      </ChoiceCard>,
    );
    const radio = screen.getByRole("radio", { name: "Balanced" });
    const card = radio.closest("label");
    expect(classes(card)).toEqual(expect.arrayContaining(["border-accent", "rounded-control", "min-w-0"]));
    expect(classes(screen.getByText("Best fit").parentElement?.parentElement ?? null)).toContain("flex-wrap");
  });
});

describe("display pieces", () => {
  it("copies with a text-only secondary button that reads Copied for a moment", async () => {
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
    render(<CopyButton text="ALLOWED_HOSTS=nas" />);
    const button = screen.getByRole("button", { name: /Copy/ });
    expect(button.querySelector("svg")).toBeNull();
    fireEvent.click(button);
    expect(await screen.findByText("Copied")).toBeTruthy();
    expect(button.textContent).toContain("Copied to clipboard");
  });

  it("keeps empty states free of icons and boxes (the caller's panel is the box)", () => {
    const { container } = render(
      <EmptyState title="No history yet">
        Finished files appear here.
      </EmptyState>,
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(container.firstElementChild?.className).not.toMatch(/border|rounded/);
  });

  it("titles a screen that is only an empty state with its h1, in the section size", () => {
    render(<EmptyState as="h1" title="This page doesn't exist" />);
    const heading = screen.getByRole("heading", { level: 1, name: "This page doesn't exist" });
    expect(classes(heading)).toEqual(expect.arrayContaining(["text-base", "font-semibold"]));
    cleanup();
    render(<EmptyState title="No history yet" />);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("opens a disclosure from a 44px summary row under a divider", () => {
    const { container } = render(<Disclosure>Codecs</Disclosure>);
    const details = container.querySelector("details");
    expect(classes(details)).toEqual(expect.arrayContaining(["border-t", "border-line"]));
    expect(classes(details?.querySelector("summary") ?? null)).toContain("min-h-11");
  });
});

describe("tabs and pages", () => {
  it("marks the current tab with a 2px border in the main text colour and no edge fades", () => {
    const { container } = render(
      <NavTabs
        label="Queue views"
        tabs={[
          { href: "#/queue", label: "Running", active: true, count: 2 },
          { href: "#/queue/next", label: "Up next", active: false, count: 30 },
        ]}
      />,
    );
    const current = screen.getByRole("link", { name: /Running/ });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(classes(current)).toEqual(expect.arrayContaining(["border-b-2", "border-ink", "min-h-11"]));
    // No fade masks over the row's edges.
    expect(container.querySelector("nav")?.className).not.toMatch(/mask/);
  });

  it("pages with 44px secondary buttons", () => {
    render(<Pager offset={0} limit={50} total={120} onPage={() => {}} />);
    for (const name of ["Previous", "Next"]) {
      expect(classes(screen.getByRole("button", { name }))).toEqual(expect.arrayContaining(["min-h-11", "bg-surface"]));
    }
  });
});

describe("ConfirmDialog", () => {
  it("keeps the confirm button primary for a destructive action (there is no red button)", async () => {
    render(
      <ConfirmDialog open onOpenChange={() => {}} title="Remove Movies?" confirmLabel="Remove library" onConfirm={() => {}}>
        <p>Its files stay where they are.</p>
      </ConfirmDialog>,
    );
    const confirm = await screen.findByRole("button", { name: "Remove library" });
    expect(classes(confirm)).toEqual(expect.arrayContaining(["bg-accent", "text-accent-ink"]));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.className).toContain("rounded-panel");
    expect(dialog.className).not.toMatch(/shadow/);
  });
});
